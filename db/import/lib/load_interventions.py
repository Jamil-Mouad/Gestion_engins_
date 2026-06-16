"""
Load interventions from gm parc auto.xlsm › BDD interv (~1095 rows).
Maps Type d'intervention → types_intervention FK.
Derives categorie from type label via normalize.py.
"""

import psycopg
from datetime import datetime
from .excel import read_bdd_interv
from .normalize import normalize_type, build_code, clean_str, to_float, to_date, intervention_categorie


def _load_type_map(cur) -> dict[str, int]:
    cur.execute("SELECT id, libelle FROM types_intervention")
    return {row[1].strip().lower(): row[0] for row in cur.fetchall()}


def _to_timestamptz(v):
    if v is None:
        return None
    if isinstance(v, datetime):
        return v
    d = to_date(v)
    return datetime(d.year, d.month, d.day) if d else None


def load(conn: psycopg.Connection, vehicule_ids: dict[str, int],
         admin_user_id: int, dry_run: bool = False) -> dict:
    rows = list(read_bdd_interv())
    ok = 0
    skipped = 0
    warnings = []

    with conn.cursor() as cur:
        type_map = _load_type_map(cur)

        for r in rows:
            raw_code  = r.get("Code") or r.get("Code Véhicule")
            raw_type  = r.get("Véhicule") or r.get("Type") or ""
            if raw_code is None:
                skipped += 1
                continue

            vtype = normalize_type(raw_type)
            code  = build_code(raw_code, vtype)
            vid   = vehicule_ids.get(code)
            if vid is None:
                skipped += 1
                continue

            type_label = clean_str(r.get("Type d'intervention"), 60) or ""
            type_id    = type_map.get(type_label.lower())
            if type_id is None:
                warnings.append(f"Unknown type: '{type_label}' — defaulting to Réparation")
                type_id = type_map.get("réparation", list(type_map.values())[0])

            categorie   = intervention_categorie(type_label)
            date_debut  = _to_timestamptz(r.get("Date début"))
            if date_debut is None:
                skipped += 1
                continue

            date_fin    = _to_timestamptz(r.get("Date fin d'intervention"))
            temps       = to_float(r.get("Temps d'intervention"))
            n_bs        = clean_str(r.get("N BS"), 30)
            partie      = clean_str(r.get("Partie véhicule"), 60)
            observations = clean_str(r.get("Détail Intervention") or r.get("Observations / Avancement"))

            if not dry_run:
                cur.execute("""
                    INSERT INTO interventions
                        (vehicule_id, type_id, categorie, partie, n_bs,
                         date_debut, date_fin, temps_heures, observations)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (vid, type_id, categorie, partie, n_bs,
                      date_debut, date_fin, temps, observations))
            ok += 1

    if warnings:
        seen = {}
        for w in warnings:
            seen[w] = seen.get(w, 0) + 1
        for msg, count in seen.items():
            print(f"  [WARN] {msg} (×{count})")

    return {"table": "interventions", "total": len(rows), "ok": ok, "skipped": skipped}
