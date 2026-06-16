"""
Load pneus from gm parc auto.xlsm › bdd pneu.
Wide format: each row = 1 vehicle + up to 16 tyre slots (14 axle + 2 spare).
Unpivot → one row per (vehicule, position) where slot is non-empty.
"""

import psycopg
from .excel import read_bdd_pneu
from .normalize import normalize_type, build_code, clean_str, to_int, to_date


def _slot_columns(headers: list[str]) -> list[tuple[int, str, str, str, str]]:
    """
    Detect tyre slot column groups from the header row.
    Each slot is a 5-column block: Reference | N serie | Date montage | Compteur | KM restant
    Returns list of (position, ref_col, nserie_col, date_col, compteur_col).
    """
    slots = []
    i = 0
    pos = 1
    while i < len(headers):
        h = str(headers[i] or "").strip()
        if "eference" in h or "Ref" in h:
            block = headers[i:i+5]
            if len(block) >= 4:
                slots.append((pos, headers[i], headers[i+1], headers[i+2], headers[i+3]))
                pos += 1
                i += 5
                continue
        i += 1
    return slots


def load(conn: psycopg.Connection, vehicule_ids: dict[str, int],
         dry_run: bool = False) -> dict:
    rows = list(read_bdd_pneu())
    ok = 0

    if not rows:
        return {"table": "pneus", "total": 0, "ok": 0}

    # detect slot structure from first row keys
    sample_keys = list(rows[0].keys())
    slots = _slot_columns(sample_keys)

    with conn.cursor() as cur:
        for r in rows:
            raw_code = r.get("Code") or r.get("CODE Véhicule") or r.get("Code Véhicule")
            raw_type = r.get("Type véhicule") or r.get("Type") or ""
            if raw_code is None:
                continue

            vtype = normalize_type(raw_type)
            code  = build_code(raw_code, vtype)
            vid   = vehicule_ids.get(code)
            if vid is None:
                continue

            compteur_vcl = to_int(r.get("Compteur"))

            for pos, ref_col, nserie_col, date_col, compteur_col in slots:
                ref_val = r.get(ref_col)
                nserie  = clean_str(r.get(nserie_col), 40)
                if not ref_val and not nserie:
                    continue  # empty slot

                date_montage  = to_date(r.get(date_col))
                km_montage    = to_int(r.get(compteur_col))
                km_parcourus  = 0
                if compteur_vcl is not None and km_montage is not None and compteur_vcl >= km_montage:
                    km_parcourus = compteur_vcl - km_montage

                if not dry_run:
                    cur.execute("""
                        INSERT INTO pneus
                            (vehicule_id, position, n_serie, date_montage, km_montage, km_parcourus)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        ON CONFLICT (vehicule_id, position) WHERE actif = true DO UPDATE
                          SET n_serie      = EXCLUDED.n_serie,
                              date_montage = EXCLUDED.date_montage,
                              km_montage   = EXCLUDED.km_montage,
                              km_parcourus = EXCLUDED.km_parcourus
                    """, (vid, pos, nserie, date_montage, km_montage, km_parcourus))
                ok += 1

    return {"table": "pneus", "total": ok, "ok": ok}
