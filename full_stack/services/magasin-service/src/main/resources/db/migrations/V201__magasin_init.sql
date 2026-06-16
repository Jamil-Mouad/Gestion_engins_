-- V201 — Magasin (gasoil) module: citerne, barème de jaugeage, arrivages,
-- sorties carburant, jaugeages quotidiens.
-- Owned by magasin-service (flyway_schema_history_magasin, baseline V11).

-- 1. citerne — the physical diesel tank (configurable; normally a single active row)
CREATE TABLE citerne (
    id                    BIGSERIAL    PRIMARY KEY,
    nom                   VARCHAR(60)  NOT NULL DEFAULT 'Citerne principale',
    capacite_litres       NUMERIC(10,2) NOT NULL CHECK (capacite_litres > 0),
    -- tonnage affiché = litres * densite / 1000 (gasoil ≈ 0.845 kg/L)
    densite_kg_par_litre  NUMERIC(6,4) NOT NULL DEFAULT 0.845 CHECK (densite_kg_par_litre > 0),
    hauteur_max_cm        NUMERIC(7,2) CHECK (hauteur_max_cm > 0),
    stock_initial_litres  NUMERIC(12,2) NOT NULL DEFAULT 0,
    stock_initial_date    DATE         NOT NULL,
    actif                 BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 2. bareme_jaugeage — admin-editable calibration: ruler height (cm) -> litres.
--    Liters for an arbitrary height are linearly interpolated between rows.
CREATE TABLE bareme_jaugeage (
    id          BIGSERIAL    PRIMARY KEY,
    citerne_id  BIGINT       NOT NULL REFERENCES citerne(id) ON DELETE CASCADE,
    hauteur_cm  NUMERIC(7,2) NOT NULL CHECK (hauteur_cm >= 0),
    litres      NUMERIC(12,2) NOT NULL CHECK (litres >= 0),
    UNIQUE (citerne_id, hauteur_cm)
);

-- 3. arrivage — fuel deliveries (~16 t every few weeks)
CREATE TABLE arrivage (
    id                BIGSERIAL     PRIMARY KEY,
    citerne_id        BIGINT        NOT NULL REFERENCES citerne(id),
    date_arrivage     DATE          NOT NULL,
    numero_bl         VARCHAR(40),
    quantite_litres   NUMERIC(12,2) NOT NULL CHECK (quantite_litres > 0),
    prix_unitaire_ht  NUMERIC(10,4) CHECK (prix_unitaire_ht IS NULL OR prix_unitaire_ht > 0),
    valeur_ht         NUMERIC(14,2),
    fournisseur       VARCHAR(120),
    source            VARCHAR(20)   NOT NULL DEFAULT 'SAISIE' CHECK (source IN ('SAISIE','IMPORT')),
    created_by        BIGINT,
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_arrivage_date ON arrivage(date_arrivage);

-- 4. sortie_carburant — every pump dispensing (bon de sortie).
--    destination keeps the raw text (engins LINDE/CHARGEUSE and third parties
--    like ARMABETON have no vehicules row); vehicule_id is the resolved match.
CREATE TABLE sortie_carburant (
    id               BIGSERIAL     PRIMARY KEY,
    citerne_id       BIGINT        NOT NULL REFERENCES citerne(id),
    date_sortie      DATE          NOT NULL,
    totaliseur       NUMERIC(14,2),
    quantite_litres  NUMERIC(10,2) NOT NULL CHECK (quantite_litres > 0),
    type_mouvement   VARCHAR(20)   NOT NULL DEFAULT 'SORTIE' CHECK (type_mouvement IN ('SORTIE','RETOUR')),
    destination      VARCHAR(120)  NOT NULL,
    vehicule_id      BIGINT        REFERENCES vehicules(id) ON DELETE SET NULL,
    vehicule_code    VARCHAR(20),
    tiers            BOOLEAN       NOT NULL DEFAULT FALSE,
    compteur         NUMERIC(12,2),
    demandeur        VARCHAR(120),
    numero_bs        VARCHAR(40),
    source           VARCHAR(20)   NOT NULL DEFAULT 'SAISIE' CHECK (source IN ('SAISIE','IMPORT')),
    created_by       BIGINT,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_sortie_date ON sortie_carburant(date_sortie);
CREATE INDEX idx_sortie_vehicule ON sortie_carburant(vehicule_id, date_sortie);
CREATE INDEX idx_sortie_code ON sortie_carburant(vehicule_code);

-- 5. jaugeage — daily ruler measurement; litres and écart are frozen at save
--    time (audit trail survives later barème or movement edits).
CREATE TABLE jaugeage (
    id                 BIGSERIAL     PRIMARY KEY,
    citerne_id         BIGINT        NOT NULL REFERENCES citerne(id),
    date_jaugeage      DATE          NOT NULL,
    hauteur_cm         NUMERIC(7,2)  NOT NULL CHECK (hauteur_cm >= 0),
    litres_mesures     NUMERIC(12,2) NOT NULL,
    litres_theoriques  NUMERIC(12,2),
    ecart_litres       NUMERIC(12,2),
    created_by         BIGINT,
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),
    UNIQUE (citerne_id, date_jaugeage)
);
