-- V109: Add trigram indexes for matricule and n_chassis search.
-- Extends V105 (code/marque/modele) so the search bar can also match by matricule/chassis.

CREATE INDEX IF NOT EXISTS idx_vehicules_matricule_trgm
    ON vehicules USING gin (lower(matricule) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_vehicules_nchassis_trgm
    ON vehicules USING gin (lower(n_chassis) gin_trgm_ops);
