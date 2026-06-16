"""
Load suivi_vidanges from gm parc auto.xlsm › Suivi des vidanges.
Each vehicle → 3 rows: filtre huile (10000), filtre gasoil (20000), filtre air (80000).
"""

import psycopg
from .excel import read_suivi_vidanges
from .normalize import normalize_type, build_code, to_int, to_date


# composant.designation → (intervalle_nbh, db_designation)
_COMPOSANTS = [
    ("Filtre à huile",  10000, "Filtre à huile"),
    ("Filtre à gasoil", 20000, "Filtre à gasoil"),
    ("Filtre à air",    80000, "Filtre à air"),
]

# column names in Suivi des vidanges for the current-NBH counter
_NBH_COLS = {
    10000: "NBH vidange",           # filtre huile
    20000: "NBH Filtre huile-gasoil",  # gasoil
    80000: "NBH filtre à air",      # air
}
_LAST_DATE_COLS = {
    10000: "Dernière vidange",
    20000: "Dernier chgt Filtre huile gasoil",
    80000: "Dernier chgt filtre à air",
}


def _get_composant_id(cur, designation: str) -> int | None:
    cur.execute("SELECT id FROM composants WHERE designation = %s LIMIT 1", (designation,))
    row = cur.fetchone()
    return row[0] if row else None


def load(conn: psycopg.Connection, vehicule_ids: dict[str, int],
         dry_run: bool = False) -> dict:
    rows = list(read_suivi_vidanges())
    ok = 0

    with conn.cursor() as cur:
        for r in rows:
            raw_code = r.get("Code Véhicule") or r.get("Code")
            raw_type = r.get("Type") or ""
            if raw_code is None:
                continue

            vtype = normalize_type(raw_type)
            code  = build_code(raw_code, vtype)
            vid   = vehicule_ids.get(code)
            if vid is None:
                continue

            for _, intervalle, designation in _COMPOSANTS:
                nbh_actuel  = to_int(r.get(_NBH_COLS.get(intervalle, ""))) or 0
                last_date   = to_date(r.get(_LAST_DATE_COLS.get(intervalle, "")))
                composant_id = _get_composant_id(cur, designation) if not dry_run else None

                if not dry_run:
                    cur.execute("""
                        INSERT INTO suivi_vidanges
                            (vehicule_id, composant_id, intervalle_nbh, compteur_nbh_actuel, date_dernier_entretien)
                        VALUES (%s, %s, %s, %s, %s)
                        ON CONFLICT DO NOTHING
                    """, (vid, composant_id, intervalle, nbh_actuel, last_date))
                ok += 1

    return {"table": "suivi_vidanges", "total": ok, "ok": ok}
