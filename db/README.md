# FleetTracker — DB bootstrap

## Quick start (3 commands)

```bash
cp .env.example .env
docker compose up -d
cd import && uv run python import_data.py
```

PostgreSQL 18 + pgvector will be up on `localhost:5432`, schema applied, and all historical data loaded.

## What's in here

| Path | Purpose |
|------|---------|
| `migrations/V1__init_extensions.sql` | pgvector + pg_cron (optional) |
| `migrations/V2__init_schema.sql` | 14 tables + CHECKs + GENERATED columns |
| `migrations/V3__seed_lookups.sql` | 16 intervention types, composants N1, dev admin user |
| `migrations/V4__triggers.sql` | updated_at, camion type check, pneu status, releve cascade |
| `migrations/V5__indexes.sql` | 8 indexes incl. partial unique tyre-per-position |
| `migrations/V6__materialized_views.sql` | mv_kpis_dispo / couts_mois / km_mois + refresh helper |
| `import/import_data.py` | ETL orchestrator |

## Known discrepancies vs plan.md

- Plan §8.4 says **17** types_intervention. The real `TYP INTERV` sheet has **16**.
  Seeded with the 16 real values. Update plan.md when confirmed.
- Plan says **~1580** interventions. `gm parc auto.xlsm › BDD interv` has **1095** rows.
  The older `.xlsx` snapshot has 1467; we use the `.xlsm` as canonical.

## Verify

```sql
SELECT count(*) FROM vehicules;         -- 42
SELECT count(*) FROM camions;           -- ~14
SELECT count(*) FROM interventions;     -- ~1095
SELECT count(*) FROM types_intervention; -- 16
SELECT count(*) FROM pneus;             -- 100–400
SELECT count(*) FROM suivi_vidanges;    -- 75
```

Trigger smoke-test:
```sql
-- fire the cascade trigger
INSERT INTO releves_compteur (vehicule_id, compteur_km, source, created_by)
SELECT id, compteur_km + 1000, 'manual', 1 FROM vehicules WHERE code = 'CAM-401';

-- check pneus were updated
SELECT km_parcourus, km_restant FROM pneus WHERE vehicule_id =
    (SELECT id FROM vehicules WHERE code = 'CAM-401');
```

## Spring Boot integration

`migrations/` is ready to be used as Flyway's `filesystem:db/migrations` location.
Set in `application.yml`:
```yaml
spring.flyway.locations: filesystem:db/migrations
```
