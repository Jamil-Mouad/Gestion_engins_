"""
Load vehicules (42 rows) and camions (subset where type=camion) from
gm parc auto.xlsm › Code Véhicule sheet.
"""

import psycopg
from .excel import read_code_vehicule
from .normalize import normalize_type, build_code, clean_str


def load(conn: psycopg.Connection, dry_run: bool = False) -> dict:
    rows = list(read_code_vehicule())
    vehicule_ids: dict[str, int] = {}
    ok = 0

    with conn.cursor() as cur:
        for r in rows:
            raw_code = r.get("CODE Véhicule")
            raw_type = r.get("Type") or ""
            marque   = clean_str(r.get("Marque") or "N/A", 60)
            matricule = clean_str(r.get("Matricule"), 20)

            if raw_code is None:
                continue

            vtype = normalize_type(raw_type)
            code  = build_code(raw_code, vtype)

            if not dry_run:
                cur.execute("""
                    INSERT INTO vehicules (code, type, marque, modele, matricule, statut)
                    VALUES (%s, %s, %s, '', %s, 'in-service')
                    ON CONFLICT (code) DO UPDATE
                      SET type      = EXCLUDED.type,
                          marque    = EXCLUDED.marque,
                          matricule = EXCLUDED.matricule
                    RETURNING id
                """, (code, vtype, marque, matricule))
                vid = cur.fetchone()[0]
                vehicule_ids[code] = vid

                if vtype == "camion":
                    cur.execute("""
                        INSERT INTO camions (vehicule_id)
                        VALUES (%s)
                        ON CONFLICT (vehicule_id) DO NOTHING
                    """, (vid,))
            ok += 1

    return {"table": "vehicules", "total": len(rows), "ok": ok, "ids": vehicule_ids}
