import logging
import threading
from flask import Blueprint, jsonify, abort
from ..auth import get_user_id, get_user_roles
from ..db import get_db
from .. import embeddings as emb

log = logging.getLogger('ai-engine.reindex')

reindex_bp = Blueprint('reindex', __name__)

_reindex_lock = threading.Lock()
_reindex_running = False

INDEX_SOURCES = [
    {'table': 'interventions',    'field': 'observations'},
    {'table': 'pneu_inspections', 'field': 'notes'},
    {'table': 'composants',       'field': 'designation'},
    {'table': 'suivi_vidanges',   'field': 'statut'},
]


def _index_one(table: str, row_id: int, text: str) -> None:
    if not text or not text.strip():
        return
    vec_str = emb.embed_str(text)
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO ai_embeddings "
                "(source_table, source_id, contenu, embedding) "
                "VALUES (%s, %s, %s, %s::vector) "
                "ON CONFLICT DO NOTHING",
                (table, row_id, text[:1000], vec_str))


def _index_text_sources():
    for source in INDEX_SOURCES:
        table = source['table']
        field = source['field']
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT MAX(created_at) FROM ai_embeddings WHERE source_table=%s",
                    (table,))
                last_indexed = cur.fetchone()[0]
                if last_indexed:
                    cur.execute(
                        f"SELECT id, {field} FROM {table} "
                        f"WHERE updated_at > %s AND {field} IS NOT NULL",
                        (last_indexed,))
                else:
                    cur.execute(
                        f"SELECT id, {field} FROM {table} WHERE {field} IS NOT NULL")
                rows = cur.fetchall()
        for row_id, text in rows:
            _index_one(table, row_id, text)


def _index_vehicules():
    """Index one rich document per vehicle (identity + status + count of
    interventions for that vehicle) so vehicle-specific and per-vehicle count
    questions can be answered from retrieval. (Since V123 composants have a
    vehicule_id FK; their designations are indexed via INDEX_SOURCES.)"""
    with get_db() as conn:
        with conn.cursor() as cur:
            # Drop embeddings for vehicles that are no longer active so the
            # index stays consistent with the fleet list the user sees.
            cur.execute(
                "DELETE FROM ai_embeddings WHERE source_table='vehicules' "
                "AND source_id IN (SELECT id FROM vehicules WHERE actif = false)")
            cur.execute(
                "SELECT MAX(created_at) FROM ai_embeddings WHERE source_table='vehicules'")
            last_indexed = cur.fetchone()[0]
            base = (
                "SELECT v.id, v.code, v.matricule, v.type, v.marque, v.modele, "
                "       v.annee, v.carburant, v.statut, v.compteur_km, v.compteur_heures, "
                "       v.chauffeur_prenom, v.chauffeur_nom, "
                "       v.capacite_tonnes, v.config_axle, "
                "       (SELECT COUNT(*) FROM interventions i WHERE i.vehicule_id = v.id) "
                "FROM vehicules v")
            if last_indexed:
                cur.execute(base + " WHERE v.actif = true AND v.updated_at > %s", (last_indexed,))
            else:
                cur.execute(base + " WHERE v.actif = true")
            rows = cur.fetchall()
    for r in rows:
        (vid, code, matricule, vtype, marque, modele, annee,
         carburant, statut, km, heures, chauffeur_prenom, chauffeur_nom,
         capacite, axle, n_interv) = r
        chauffeur = (
            f"{(chauffeur_prenom or '').strip()} {(chauffeur_nom or '').strip()}".strip()
            or 'non renseigné'
        )
        text = (
            f"Véhicule {code} ({matricule or 'sans matricule'}) — "
            f"{vtype} {marque} {modele}, année {annee or 'n/a'}, "
            f"carburant {carburant or 'n/a'}, statut {statut}, "
            f"{km or 0} km, {heures or 0} h. "
            f"Chauffeur: {chauffeur}. "
            f"Capacité {capacite or 'n/a'} t, config {axle or 'n/a'}. "
            f"Interventions: {n_interv}."
        )
        _index_one('vehicules', vid, text)


def _format_fleet_summary(total, by_type, by_statut, n_interv, n_comp, n_pneus,
                          code_rosters=()) -> str:
    """Render aggregate fleet statistics to concise French text (≤2500 chars).
    `code_rosters` is a list of (type, 'CODE1, CODE2, …') pairs so "donne moi
    les codes des camions" is answerable straight from the summary.
    Pure function — no DB/model — so it is unit-testable in isolation."""
    type_txt = ', '.join(f"{c} {t}" for t, c in by_type) or 'aucun'
    statut_txt = ', '.join(f"{c} {s}" for s, c in by_statut) or 'aucun'
    text = (
        f"Statistiques du parc INTERSIG FleetTracker : {total} véhicules au total. "
        f"Par type : {type_txt}. Par statut : {statut_txt}. "
        f"{n_interv} interventions, {n_comp} composants, {n_pneus} pneus enregistrés.")
    if code_rosters:
        rosters = ' '.join(f"{t} : {codes}." for t, codes in code_rosters)
        text += f" Codes des véhicules par type — {rosters}"
    return text[:2500]


def _build_fleet_summary():
    """Compute aggregate fleet statistics and upsert a single 'fleet_summary'
    row. Always recomputed (full) so dénombrement questions get real totals."""
    with get_db() as conn:
        with conn.cursor() as cur:
            # Count only active vehicles — matches the fleet list the user sees
            # in the app (VehiculeService.list → findByActifTrue).
            cur.execute("SELECT COUNT(*) FROM vehicules WHERE actif = true")
            total = cur.fetchone()[0]
            cur.execute(
                "SELECT type, COUNT(*) FROM vehicules WHERE actif = true "
                "GROUP BY type ORDER BY COUNT(*) DESC")
            by_type = cur.fetchall()
            cur.execute(
                "SELECT statut, COUNT(*) FROM vehicules WHERE actif = true "
                "GROUP BY statut ORDER BY COUNT(*) DESC")
            by_statut = cur.fetchall()
            cur.execute("SELECT COUNT(*) FROM interventions")
            n_interv = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM composants")
            n_comp = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM pneus")
            n_pneus = cur.fetchone()[0]
            cur.execute(
                "SELECT type, string_agg(code, ', ' ORDER BY code) "
                "FROM vehicules WHERE actif = true "
                "GROUP BY type ORDER BY type")
            code_rosters = cur.fetchall()

    text = _format_fleet_summary(total, by_type, by_statut, n_interv, n_comp, n_pneus,
                                 code_rosters)
    vec_str = emb.embed_str(text)
    # Delete-then-insert (single transaction) — the ai_embeddings table has no
    # unique constraint to target with ON CONFLICT, and there is exactly one
    # logical summary row, so a full refresh is the simplest robust upsert.
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM ai_embeddings WHERE source_table='fleet_summary'")
            cur.execute(
                "INSERT INTO ai_embeddings "
                "(source_table, source_id, contenu, embedding) "
                "VALUES ('fleet_summary', 0, %s, %s::vector)",
                (text, vec_str))


def _run_reindex():
    global _reindex_running
    try:
        _index_text_sources()
        _index_vehicules()
        _build_fleet_summary()
        log.info('reindex completed')
    except Exception:
        log.exception('reindex failed')
    finally:
        with _reindex_lock:
            _reindex_running = False


@reindex_bp.route('/ai/embeddings/reindex', methods=['POST'])
def reindex():
    global _reindex_running
    get_user_id()
    roles = get_user_roles()
    if 'ROLE_FLEET_MANAGER' not in roles and 'ROLE_ADMIN' not in roles:
        abort(403, description='Insufficient role')
    with _reindex_lock:
        if _reindex_running:
            return jsonify({'status': 'already_running'}), 202
        _reindex_running = True
    threading.Thread(target=_run_reindex, daemon=True).start()
    return jsonify({'status': 'reindex_started'}), 202
