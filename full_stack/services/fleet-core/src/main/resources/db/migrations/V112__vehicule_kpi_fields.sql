-- V112: Add per-vehicle KPI fields (voyages/mois and km parcourus monthly)
-- km_cumule is served by the existing compteur_km column.
-- pct_conso_vs_flotte is computed at read-time, not stored.

ALTER TABLE vehicules
    ADD COLUMN IF NOT EXISTS voyages_mois   INTEGER,
    ADD COLUMN IF NOT EXISTS km_parcourus   INTEGER;

COMMENT ON COLUMN vehicules.voyages_mois  IS 'Number of trips per month (editable, camion types only)';
COMMENT ON COLUMN vehicules.km_parcourus  IS 'Monthly km driven (editable, camion types only)';
