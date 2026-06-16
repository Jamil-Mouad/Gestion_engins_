CREATE EXTENSION IF NOT EXISTS vector;

DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
EXCEPTION
    WHEN feature_not_supported OR undefined_file THEN
        RAISE NOTICE 'pg_cron not available — KPI refresh will rely on app-level scheduling';
END;
$$;
