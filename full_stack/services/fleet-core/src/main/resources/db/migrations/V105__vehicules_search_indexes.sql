-- Enable trigram extension for fast ILIKE searches on vehicle fields
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_vehicules_code_trgm
    ON vehicules USING gin (lower(code) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_vehicules_marque_trgm
    ON vehicules USING gin (lower(marque) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_vehicules_modele_trgm
    ON vehicules USING gin (lower(modele) gin_trgm_ops);
