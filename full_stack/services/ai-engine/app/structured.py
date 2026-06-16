"""Deterministic, identifier-aware SQL lookups for the chat pipeline.

The vector search in embeddings.py is great for fuzzy semantic matches but
misses precise entity lookups (vehicle code, type roster, driver assignment).
This module closes that gap with a thin, pure DB-access layer that the chat
route calls BEFORE the LLM. The LLM still synthesizes the final answer; it
just gets a richer, fully-populated context block to work with.

Pure helpers (normalize_*, render_*) take/return plain dicts and are
unit-testable without a DB. DB-touching functions are intentionally simple —
they live next to the data they query.
"""
import re
from .db import get_db

_VEHICLE_CODE_RE = re.compile(r'\b[A-Z]{2,4}[-_][A-Z0-9]*\d{2,5}\b', re.IGNORECASE)

# UI / French label → DB enum value. The DB CHECK constraint on
# vehicules.type uses snake_case (camion_tracteur, semi_remorque, pick_up),
# but users write the hyphenated forms in chat.
_TYPE_LABEL_MAP = {
    'camion':           'camion',
    'camion_tracteur':  'camion_tracteur',
    'camion-tracteur':  'camion_tracteur',
    'camion tracteur':  'camion_tracteur',
    'tracteur':         'camion_tracteur',
    'semi_remorque':    'semi_remorque',
    'semi-remorque':    'semi_remorque',
    'semi':             'semi_remorque',
    'remorque':         'semi_remorque',
    'chariot':          'chariot',
    'chargeur':         'chargeur',
    'voiture':          'voiture',
    'bus':              'bus',
    'balayeuse':        'balayeuse',
    'pick_up':          'pick_up',
    'pick-up':          'pick_up',
    'pickup':           'pick_up',
}


def normalize_type_label(label: str) -> str | None:
    """Map a French/UI type label to its DB enum value. Case-insensitive.
    Plural forms ("camions", "semi-remorques", "camions tracteurs") are
    reduced word-by-word to their singular before lookup.
    Returns None when the label is not recognized."""
    if not label:
        return None
    key = label.strip().lower()
    hit = _TYPE_LABEL_MAP.get(key)
    if hit:
        return hit
    singular = re.sub(r's\b', '', key)
    if singular != key:
        return _TYPE_LABEL_MAP.get(singular)
    return None


def detect_vehicle_code(text: str) -> str | None:
    """Return the first vehicle-code-looking token in `text`, or None.

    Accepts CAM-403, CAM_403, CAM403 — anything of the form 2-4 uppercase
    letters, optional separator, then 2-5 digits. Case-insensitive."""
    if not text:
        return None
    m = _VEHICLE_CODE_RE.search(text)
    return m.group(0).upper().replace('_', '-') if m else None


def _row_to_vehicle_dict(row) -> dict:
    """Map a raw cursor row to the user-facing vehicle dict.

    Column order must match the SELECT in lookup_vehicle() and
    list_vehicles_by_type(). Keep in sync.
    """
    return {
        'id':              row[0],
        'code':            row[1],
        'matricule':       row[2],
        'type':            row[3],
        'marque':          row[4],
        'modele':          row[5],
        'annee':           row[6],
        'carburant':       row[7],
        'statut':          row[8],
        'compteur_km':     row[9],
        'compteur_heures': row[10],
        'chauffeur_prenom': row[11],
        'chauffeur_nom':    row[12],
        'capacite_tonnes':  row[13],
        'config_axle':      row[14],
        'date_mise_service': row[15],
        'n_interventions':  int(row[16]) if row[16] is not None else 0,
    }


_VEHICLE_SELECT = (
    "SELECT v.id, v.code, v.matricule, v.type, v.marque, v.modele, "
    "       v.annee, v.carburant, v.statut, v.compteur_km, v.compteur_heures, "
    "       v.chauffeur_prenom, v.chauffeur_nom, "
    "       v.capacite_tonnes, v.config_axle, v.date_mise_service, "
    "       (SELECT COUNT(*) FROM interventions i WHERE i.vehicule_id = v.id) "
    "FROM vehicules v"
)


def lookup_vehicles(query: str) -> list[dict]:
    """Find active vehicles by code, matricule, or n_chassis.

    Exact match on `code` first — a code may legitimately match several
    vehicles (a camion_tracteur and its semi_remorque share one fleet code),
    so all code matches are returned. Falls back to ILIKE on `matricule`,
    then on `n_chassis` (both unique → single row). Empty list when nothing
    matches."""
    if not query or not query.strip():
        return []
    q = query.strip()
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(_VEHICLE_SELECT + " WHERE v.actif=true AND v.code = %s ORDER BY v.type", (q,))
            rows = cur.fetchall()
            if not rows:
                cur.execute(_VEHICLE_SELECT + " WHERE v.actif=true AND v.matricule ILIKE %s LIMIT 1", (q,))
                rows = cur.fetchall()
            if not rows:
                cur.execute(_VEHICLE_SELECT + " WHERE v.actif=true AND v.n_chassis ILIKE %s LIMIT 1", (q,))
                rows = cur.fetchall()
    return [_row_to_vehicle_dict(r) for r in rows]


def lookup_vehicle(query: str) -> dict | None:
    """Single-vehicle variant of lookup_vehicles(): first match or None."""
    vehicles = lookup_vehicles(query)
    return vehicles[0] if vehicles else None


def list_all_vehicles() -> list[dict]:
    """Return every active vehicle, grouped by type then code — used by the
    'fleet_list' intent ("donne moi les codes des véhicules du parc")."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(_VEHICLE_SELECT + " WHERE v.actif=true ORDER BY v.type, v.code")
            rows = cur.fetchall()
    return [_row_to_vehicle_dict(r) for r in rows]


def list_vehicles_by_type(type_label: str) -> list[dict]:
    """Return all active vehicles whose `type` matches the given label.

    Unknown labels return an empty list (the chat route then renders a
    helpful "no vehicles of type X" message)."""
    db_type = normalize_type_label(type_label)
    if not db_type:
        return []
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                _VEHICLE_SELECT + " WHERE v.actif=true AND v.type = %s "
                "ORDER BY v.code",
                (db_type,))
            rows = cur.fetchall()
    return [_row_to_vehicle_dict(r) for r in rows]


def list_drivers() -> list[dict]:
    """Return the distinct driver roster (non-NULL chauffeur_* on vehicules),
    sorted by most-assigned first. Includes the number of vehicles each
    driver is currently assigned to."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT chauffeur_prenom, chauffeur_nom, COUNT(*) AS n "
                "FROM vehicules "
                "WHERE actif=true AND (chauffeur_prenom IS NOT NULL OR chauffeur_nom IS NOT NULL) "
                "GROUP BY chauffeur_prenom, chauffeur_nom "
                "ORDER BY n DESC, chauffeur_nom, chauffeur_prenom"
            )
            rows = cur.fetchall()
    return [
        {'chauffeur_prenom': r[0], 'chauffeur_nom': r[1], 'n_vehicules': int(r[2])}
        for r in rows
    ]


# ─────────────────────── rendering (pure, no DB) ────────────────────────────

def _driver_text(v: dict) -> str:
    prenom = (v.get('chauffeur_prenom') or '').strip()
    nom = (v.get('chauffeur_nom') or '').strip()
    if not prenom and not nom:
        return 'Chauffeur non renseigné dans la base.'
    return f"Chauffeur: {prenom} {nom}".strip()


def render_vehicle(v: dict) -> str:
    """Render a single vehicle record to concise French text (≤1500 chars)."""
    parts = [
        f"Véhicule #{v['id']} ({v['code']} / {v.get('matricule') or 'sans matricule'}) : "
        f"{v['type']} {v['marque']} {v.get('modele') or ''}".rstrip() + ',',
        f"année {v.get('annee') or 'n/a'}, carburant {v.get('carburant') or 'n/a'}, "
        f"statut {v.get('statut') or 'n/a'},",
        f"{v.get('compteur_km') or 0} km, {v.get('compteur_heures') or 0} h.",
        _driver_text(v) + '.',
    ]
    if v.get('capacite_tonnes') is not None:
        parts.append(f"Capacité: {v['capacite_tonnes']} t.")
    if v.get('config_axle'):
        parts.append(f"Configuration essieux: {v['config_axle']}.")
    if v.get('date_mise_service'):
        parts.append(f"Mise en service: {v['date_mise_service']}.")
    parts.append(f"Interventions enregistrées: {v.get('n_interventions', 0)}.")
    return ' '.join(parts)[:1500]


def render_vehicle_list(vehicles: list[dict], header: str) -> str:
    """Render a list of vehicles. Header is preserved verbatim. Empty list
    returns a clear "aucun véhicule" message."""
    if not vehicles:
        return f"{header}: aucun véhicule trouvé dans le parc actif."
    lines = [header + ' :']
    for v in vehicles:
        km = v.get('compteur_km') or 0
        lines.append(
            f"- {v['code']} ({v.get('matricule') or 'sans matricule'}) — "
            f"{v['type']} {v['marque']} {v.get('modele') or ''}, "
            f"{km} km, statut {v.get('statut') or 'n/a'}, "
            f"{v.get('n_interventions', 0)} intervention(s)."
        )
    # 4000 chars ≈ 25 vehicles — enough for a full type roster without
    # flooding the LLM context (1500 truncated mid-list at ~10 vehicles).
    return '\n'.join(lines)[:4000]


def render_driver_roster(drivers: list[dict], header: str) -> str:
    if not drivers:
        return f"{header}: aucun chauffeur n'est actuellement assigné à un véhicule du parc."
    lines = [header + ' :']
    for d in drivers:
        name = f"{d.get('chauffeur_prenom') or ''} {d.get('chauffeur_nom') or ''}".strip()
        lines.append(f"- {name} — {d['n_vehicules']} véhicule(s) assigné(s).")
    return '\n'.join(lines)[:1500]


# ─────────────────────── intent detection (pure) ────────────────────────────

_DETAIL_KEYWORDS = ('infos', 'détails', 'détail', 'détaillé', 'détaillée',
                    'detail', 'informations', 'fiche')
_DRIVER_KEYWORDS = ('chauffeur', 'conducteur', 'driver', 'pilote')
_TYPE_KEYWORDS = ('type', 'types')
_LIST_KEYWORDS = ('liste', 'donne', 'combien', 'affiche', 'montre', 'quels')
_CODE_KEYWORDS = ('code', 'codes')
_FLEET_KEYWORDS = ('vehicule', 'véhicule', 'vehicules', 'véhicules',
                   'parc', 'flotte')


def detect_intent(message: str) -> dict:
    """Classify the user's intent into a single action.

    Returns a dict with keys:
      - 'kind': 'vehicle_code' | 'vehicle_detail' | 'type_list' | 'fleet_list'
                | 'driver_for_vehicle' | 'driver_roster' | 'none'
      - 'value': the extracted code/label/query (str | None)

    Priority: explicit vehicle code (most specific) > "type X" (very
    specific) > type token anywhere ("les camions") > "détails sur X" >
    driver roster > whole-fleet listing > none.
    """
    msg = (message or '').strip()
    if not msg:
        return {'kind': 'none', 'value': None}

    code = detect_vehicle_code(msg)
    msg_l = msg.lower()

    if code:
        if any(k in msg_l for k in _DRIVER_KEYWORDS):
            return {'kind': 'driver_for_vehicle', 'value': code}
        return {'kind': 'vehicle_code', 'value': code}

    if any(k in msg_l for k in _TYPE_KEYWORDS):
        # grab the noun following "type"/"types" (or the label after "de type")
        m = re.search(r'(?:types?|de type)\s+([a-zA-Zà-ÿ\-_ ]{3,30})', msg, re.IGNORECASE)
        if m:
            label = m.group(1).strip().rstrip('?.!')
            return {'kind': 'type_list', 'value': label}
        return {'kind': 'type_list', 'value': None}

    wants_info = any(k in msg_l
                     for k in _LIST_KEYWORDS + _DETAIL_KEYWORDS + _CODE_KEYWORDS)

    if wants_info:
        # "donne moi le code des camions", "les infos des 7 camions" — any
        # token that resolves to a vehicle type wins (plurals included).
        tokens = re.findall(r'[a-zA-Zà-ÿ\-_]{3,}', msg_l)
        for t in tokens:
            if normalize_type_label(t):
                return {'kind': 'type_list', 'value': t}

    if any(k in msg_l for k in _DETAIL_KEYWORDS):
        # try to pull the next capitalized token as a code or matricule
        m = re.search(r'\b([A-Z]{2,4}[-_]?\d{2,5}|[A-Z]{2,4})\b', msg)
        if m:
            return {'kind': 'vehicle_detail', 'value': m.group(1).upper().replace('_', '-')}

    if any(k in msg_l for k in _DRIVER_KEYWORDS):
        return {'kind': 'driver_roster', 'value': None}

    if wants_info and any(k in msg_l for k in _FLEET_KEYWORDS + _CODE_KEYWORDS):
        # list/code question with no recognizable type → whole-fleet roster
        return {'kind': 'fleet_list', 'value': None}

    return {'kind': 'none', 'value': None}


def run_intent(message: str) -> tuple[str, list[dict]]:
    """High-level entry point: detect intent, run the matching SQL query,
    return (rendered_text, sources).

    Returns ('', []) when nothing matches — the caller then falls back to
    the existing vector-search path. `sources` are shaped for the chat
    SSE 'source' event consumed by the frontend."""
    intent = detect_intent(message)
    kind, val = intent['kind'], intent['value']

    if kind in ('vehicle_code', 'vehicle_detail'):
        vehicles = lookup_vehicles(val) if val else []
        if not vehicles:
            return f"Aucun véhicule actif trouvé pour « {val} » dans la base.", []
        # several vehicles can share one fleet code (tracteur + semi pair):
        # render each, prefixed by its type so the LLM can disambiguate.
        if len(vehicles) == 1:
            text = render_vehicle(vehicles[0])
        else:
            text = '\n\n'.join(f"[{v['type']}] {render_vehicle(v)}" for v in vehicles)
        return text, [{
            'title': f"Véhicule {v['code']} ({v['type']})" if len(vehicles) > 1
                     else f"Véhicule {v['code']}",
            'url':   f"/vehicules/{v['id']}",
        } for v in vehicles]

    if kind == 'driver_for_vehicle':
        vehicles = lookup_vehicles(val) if val else []
        if not vehicles:
            return f"Aucun véhicule actif trouvé pour « {val} » dans la base.", []
        if len(vehicles) == 1:
            text = _driver_text(vehicles[0]) + '.'
        else:
            text = '\n'.join(f"[{v['type']}] {_driver_text(v)}." for v in vehicles)
        return text, [{
            'title': f"Véhicule {v['code']}",
            'url':   f"/vehicules/{v['id']}",
        } for v in vehicles]

    if kind == 'fleet_list':
        return render_vehicle_list(
            list_all_vehicles(),
            "Véhicules du parc actif (par type)"), []

    if kind == 'type_list':
        if not val:
            return '', []
        vehicles = list_vehicles_by_type(val)
        if not vehicles and normalize_type_label(val) is None:
            return f"Type de véhicule inconnu : « {val} ». Types disponibles : camion, camion_tracteur, chariot, chargeur, semi_remorque, voiture, bus, balayeuse, pick_up.", []
        return render_vehicle_list(
            vehicles,
            f"Véhicules de type {normalize_type_label(val) or val}"), []

    if kind == 'driver_roster':
        return render_driver_roster(
            list_drivers(),
            "Chauffeurs actuellement assignés"), []

    return '', []
