-- ============================================================================
-- cleanup-fresh-delivery.sql
-- Reset FleetTracker to a fresh-delivery state for the client hand-over.
--
--   KEEP : intervention types (types_intervention),
--          composant templates (composants WHERE vehicule_id IS NULL),
--          the whole Magasin module (citerne, bareme_jaugeage, arrivage,
--          sortie_carburant, jaugeage),
--          the two dev accounts (admin.dev / magasin.dev).
--   WIPE : all fleet operational data, AI chat + RAG index, and every other user.
--
--   flyway_schema_history* tables are never touched.
--
-- NOTE: this script lives OUTSIDE db/seed/ on purpose — db/seed/ is mounted as
--       the Postgres docker-entrypoint-initdb.d, which would run this first on a
--       fresh init (against an empty DB) and crash. Run it manually instead.
--
-- Run with:  psql ... -v ON_ERROR_STOP=1 -f cleanup-fresh-delivery.sql
-- ============================================================================
BEGIN;

-- Safety guard: never run if the dev accounts are missing (would lock everyone out).
DO $$
BEGIN
  IF (SELECT count(*) FROM users
        WHERE email IN ('admin.dev@intersig.ma','magasin.dev@intersig.ma')) < 2 THEN
    RAISE EXCEPTION 'Dev accounts missing — aborting to avoid lockout';
  END IF;
END $$;

-- 1. AI chat history + RAG index (reference stale fleet data)
DELETE FROM ai_messages;
DELETE FROM ai_conversations;
DELETE FROM ai_embeddings;

-- 2. Fleet operational data (children before parents; all FK-reference
--    vehicules with NO ACTION, so order matters)
DELETE FROM interventions;
DELETE FROM demandes_achat;
DELETE FROM pneu_inspections;
DELETE FROM pneus;
DELETE FROM suivi_vidanges;
DELETE FROM releves_compteur;
DELETE FROM imports_historique;
DELETE FROM tracteur_semi_assignment;
DELETE FROM notifications;

-- 3. Per-vehicle component instances — KEEP the templates (vehicule_id IS NULL)
UPDATE composants SET parent_id = NULL WHERE vehicule_id IS NOT NULL;  -- break self-FK first
DELETE FROM composants WHERE vehicule_id IS NOT NULL;

-- 4. Detach the (kept) magasin sorties from the vehicles, then wipe vehicles.
--    sortie_carburant.vehicule_id is ON DELETE SET NULL, but we null it
--    explicitly so the intent is obvious; vehicule_code text is preserved.
UPDATE sortie_carburant SET vehicule_id = NULL WHERE vehicule_id IS NOT NULL;
DELETE FROM vehicules;

-- 5. Users — keep ONLY the two dev accounts.
--    Kept composant templates may carry cree_par pointing at a user we delete,
--    so null that audit column first (it is nullable).
UPDATE composants SET cree_par = NULL WHERE cree_par IS NOT NULL;
DELETE FROM users
 WHERE email NOT IN ('admin.dev@intersig.ma','magasin.dev@intersig.ma');

COMMIT;

-- 6. Recompute the KPI materialized views against the now-empty fleet.
--    Non-concurrent REFRESH so it runs cleanly right after the wipe.
REFRESH MATERIALIZED VIEW mv_kpis_dispo;
REFRESH MATERIALIZED VIEW mv_kpis_couts_mois;
REFRESH MATERIALIZED VIEW mv_kpis_km_mois;
