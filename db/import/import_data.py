"""
INTERSIG FleetTracker — one-shot ETL from Excel sources into PostgreSQL.

Run from the db/import/ directory:
    uv run python import_data.py
    uv run python import_data.py --dry-run

Requires DATABASE_URL in db/.env (resolved via lib/db.py).

Import order (FK dependency):
    vehicules + camions → pneus → suivi_vidanges → releves_compteur → interventions → imports_historique
"""

import argparse
import sys
import time
from datetime import datetime, timezone

sys.path.insert(0, str(__import__("pathlib").Path(__file__).parent))

from lib.db import get_connection
from lib.normalize import normalize_type, build_code, to_int
from lib.excel import read_bdd_pneu
from lib import (
    load_vehicules,
    load_pneus,
    load_vidanges,
    load_interventions,
)


def seed_releves_compteur(conn, vehicule_ids: dict[str, int],
                          admin_id: int, dry_run: bool) -> dict:
    """
    Synthesize one releve_compteur per vehicle from the latest bdd_pneu.Compteur.
    This primes vehicules.compteur_km so subsequent Δkm calculations are correct.
    """
    rows = list(read_bdd_pneu())
    ok = 0

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

            compteur_km = to_int(r.get("Compteur"))
            if compteur_km is None:
                continue

            if not dry_run:
                cur.execute("""
                    INSERT INTO releves_compteur
                        (vehicule_id, compteur_km, source, created_by, date_releve)
                    VALUES (%s, %s, 'migration', %s, %s)
                """, (vid, compteur_km, admin_id,
                      datetime(2025, 12, 31, 0, 0, tzinfo=timezone.utc)))
            ok += 1

    return {"table": "releves_compteur", "ok": ok}


def get_admin_id(conn) -> int:
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM users WHERE email = 'admin@intersig.local' LIMIT 1")
        row = cur.fetchone()
        if not row:
            raise RuntimeError(
                "Dev admin user not found — make sure migrations (V3) have been applied."
            )
        return row[0]


def print_summary(results: list[dict], elapsed: float) -> None:
    print("\n========== Import summary ==========")
    for r in results:
        table   = r.get("table", "?")
        total   = r.get("total", r.get("ok", "?"))
        ok      = r.get("ok", "?")
        skipped = r.get("skipped", "")
        skip_s  = f"  skipped {skipped}" if skipped else ""
        print(f"  {table:<25} {ok}/{total} rows{skip_s}")
    print(f"  elapsed: {elapsed:.1f}s")
    print("====================================\n")


def main():
    parser = argparse.ArgumentParser(description="FleetTracker Excel → Postgres ETL")
    parser.add_argument("--dry-run", action="store_true",
                        help="Parse Excel and print counts without writing to DB")
    args = parser.parse_args()
    dry_run = args.dry_run

    if dry_run:
        print("=== DRY RUN — no data will be written ===\n")

    t0 = time.time()
    results = []

    conn = get_connection()
    try:
        with conn.transaction():
            admin_id = get_admin_id(conn)

            # 1. vehicules + camions
            print("Loading vehicules…")
            res = load_vehicules.load(conn, dry_run=dry_run)
            results.append(res)
            vehicule_ids: dict[str, int] = res["ids"]
            print(f"  → {res['ok']} vehicules")

            # 2. pneus
            print("Loading pneus…")
            res = load_pneus.load(conn, vehicule_ids, dry_run=dry_run)
            results.append(res)
            print(f"  → {res['ok']} pneus")

            # 3. suivi_vidanges
            print("Loading suivi_vidanges…")
            res = load_vidanges.load(conn, vehicule_ids, dry_run=dry_run)
            results.append(res)
            print(f"  → {res['ok']} vidange records")

            # 4. seed releves_compteur (primes compteur_km + triggers)
            print("Seeding releves_compteur (initial counters)…")
            res = seed_releves_compteur(conn, vehicule_ids, admin_id, dry_run=dry_run)
            results.append(res)
            print(f"  → {res['ok']} releves")

            # 5. interventions
            print("Loading interventions…")
            res = load_interventions.load(conn, vehicule_ids, admin_id, dry_run=dry_run)
            results.append(res)
            print(f"  → {res['ok']} interventions ({res.get('skipped', 0)} skipped)")

            # 6. imports_historique audit row
            if not dry_run:
                total_interventions = res["total"]
                ok_interventions    = res["ok"]
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO imports_historique
                            (user_id, fichier, type, lignes_total, lignes_ok, lignes_erreur)
                        VALUES (%s, %s, 'migration', %s, %s, %s)
                    """, (admin_id, "gm parc auto.xlsm",
                          total_interventions, ok_interventions,
                          total_interventions - ok_interventions))

    finally:
        conn.close()

    print_summary(results, time.time() - t0)

    if not dry_run:
        print("Database bootstrapped. Next step: docker compose exec postgres psql -U intersig fleettracker -c \"SELECT count(*) FROM vehicules;\"")


if __name__ == "__main__":
    main()
