CREATE TABLE tracteur_semi_assignment (
    id          BIGSERIAL PRIMARY KEY,
    tracteur_id BIGINT NOT NULL REFERENCES vehicules(id),
    semi_id     BIGINT NOT NULL REFERENCES vehicules(id),
    date_debut  DATE NOT NULL,
    date_fin    DATE,
    actif       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- At most one active assignment per tracteur
CREATE UNIQUE INDEX uidx_tsa_tracteur_active
    ON tracteur_semi_assignment (tracteur_id)
    WHERE date_fin IS NULL AND actif = TRUE;

-- At most one active assignment per semi
CREATE UNIQUE INDEX uidx_tsa_semi_active
    ON tracteur_semi_assignment (semi_id)
    WHERE date_fin IS NULL AND actif = TRUE;

-- Query performance
CREATE INDEX idx_tsa_tracteur ON tracteur_semi_assignment (tracteur_id);
CREATE INDEX idx_tsa_semi     ON tracteur_semi_assignment (semi_id);

-- Auto-update updated_at
CREATE TRIGGER tsa_updated_at
    BEFORE UPDATE ON tracteur_semi_assignment
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
