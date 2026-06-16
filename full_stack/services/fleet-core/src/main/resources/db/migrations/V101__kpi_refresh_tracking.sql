-- ============================================================
-- V11 — KPI materialized-view refresh tracking
-- ============================================================
-- pg_matviews does not expose a last_refresh column in standard
-- PostgreSQL. This table records when each MV was last refreshed,
-- updated by refresh_kpis() via UPSERT.

CREATE TABLE kpi_matview_refresh (
    matview_name VARCHAR(100) PRIMARY KEY,
    last_refresh TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial rows so the table is never empty after first deploy
INSERT INTO kpi_matview_refresh (matview_name, last_refresh)
VALUES
    ('mv_kpis_dispo',       NOW()),
    ('mv_kpis_couts_mois',  NOW()),
    ('mv_kpis_km_mois',     NOW());

-- Re-create refresh_kpis() to update the tracking table
CREATE OR REPLACE FUNCTION refresh_kpis()
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_kpis_dispo;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_kpis_couts_mois;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_kpis_km_mois;

    INSERT INTO kpi_matview_refresh (matview_name, last_refresh)
    VALUES
        ('mv_kpis_dispo',      NOW()),
        ('mv_kpis_couts_mois', NOW()),
        ('mv_kpis_km_mois',    NOW())
    ON CONFLICT (matview_name) DO UPDATE
        SET last_refresh = EXCLUDED.last_refresh;
END;
$$;
