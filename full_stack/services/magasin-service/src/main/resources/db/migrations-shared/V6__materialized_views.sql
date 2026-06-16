-- ============================================================
-- V6 — Materialized views for KPI dashboard cards
-- ============================================================

-- mv_kpis_dispo: fleet availability rate per day
CREATE MATERIALIZED VIEW mv_kpis_dispo AS
SELECT
    d.day::DATE                                          AS jour,
    ROUND(
        1.0 - COUNT(DISTINCT s.vehicule_id)::NUMERIC
              / NULLIF((SELECT COUNT(*) FROM vehicules WHERE actif = true), 0),
        4
    )                                                    AS taux_dispo
FROM
    generate_series(
        (SELECT MIN(date_debut)::DATE FROM interventions),
        CURRENT_DATE,
        INTERVAL '1 day'
    ) AS d(day)
LEFT JOIN interventions s
    ON s.date_debut::DATE <= d.day
   AND (s.date_fin IS NULL OR s.date_fin::DATE >= d.day)
   AND s.categorie IN ('corrective','depannage')
GROUP BY d.day
ORDER BY d.day;

-- mv_kpis_couts_mois: total maintenance cost per month
CREATE MATERIALIZED VIEW mv_kpis_couts_mois AS
SELECT
    date_trunc('month', date_debut)::DATE AS mois,
    SUM(cout_total)                       AS cout_total_mad
FROM interventions
GROUP BY date_trunc('month', date_debut)
ORDER BY mois;

-- mv_kpis_km_mois: km driven per month (from releves_compteur)
CREATE MATERIALIZED VIEW mv_kpis_km_mois AS
WITH monthly AS (
    SELECT
        vehicule_id,
        date_trunc('month', date_releve)::DATE                                 AS mois,
        MAX(compteur_km)                                                       AS km_fin,
        LAG(MAX(compteur_km)) OVER (PARTITION BY vehicule_id ORDER BY date_trunc('month', date_releve)) AS km_debut
    FROM releves_compteur
    WHERE compteur_km IS NOT NULL
    GROUP BY vehicule_id, date_trunc('month', date_releve)
)
SELECT
    mois,
    SUM(GREATEST(0, km_fin - COALESCE(km_debut, km_fin))) AS km_parcourus_mois
FROM monthly
GROUP BY mois
ORDER BY mois;

-- Refresh helper callable from app or pg_cron
CREATE OR REPLACE FUNCTION refresh_kpis()
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_kpis_dispo;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_kpis_couts_mois;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_kpis_km_mois;
END;
$$;

-- Add unique indexes required for CONCURRENTLY refresh
CREATE UNIQUE INDEX mv_kpis_dispo_jour           ON mv_kpis_dispo (jour);
CREATE UNIQUE INDEX mv_kpis_couts_mois_mois       ON mv_kpis_couts_mois (mois);
CREATE UNIQUE INDEX mv_kpis_km_mois_mois          ON mv_kpis_km_mois (mois);

-- Schedule daily 02:00 refresh via pg_cron if available
DO $$
BEGIN
    IF to_regclass('cron.job') IS NOT NULL THEN
        PERFORM cron.schedule('refresh_kpis_daily', '0 2 * * *', 'SELECT refresh_kpis()');
    END IF;
END;
$$;
