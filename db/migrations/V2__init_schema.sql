-- ============================================================
-- V2 — Full schema (14 tables, dependency order)
-- ============================================================

-- 1. users
CREATE TABLE users (
    id                         BIGSERIAL PRIMARY KEY,
    email                      VARCHAR(120) UNIQUE NOT NULL,
    password_hash              VARCHAR(255) NOT NULL,
    prenom                     VARCHAR(60)  NOT NULL,
    nom                        VARCHAR(60)  NOT NULL,
    fonction                   VARCHAR(60),
    matricule_emp              VARCHAR(30),
    site                       VARCHAR(60),
    telephone                  VARCHAR(20),
    dashboard_config           JSONB        NOT NULL DEFAULT '{}'::jsonb,
    preferences_notifications  JSONB        NOT NULL DEFAULT '{}'::jsonb,
    created_at                 TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at                 TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 2. fournisseurs
CREATE TABLE fournisseurs (
    id         BIGSERIAL PRIMARY KEY,
    nom        VARCHAR(120) NOT NULL,
    contact    VARCHAR(80),
    email      VARCHAR(120),
    tel        VARCHAR(20),
    ice        VARCHAR(30),
    actif      BOOLEAN      NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 3. composants (self-referencing tree, 3 levels)
CREATE TABLE composants (
    id            BIGSERIAL PRIMARY KEY,
    parent_id     BIGINT      REFERENCES composants(id),
    niveau        SMALLINT    NOT NULL CHECK (niveau BETWEEN 1 AND 3),
    reference     VARCHAR(40) UNIQUE,
    designation   VARCHAR(120) NOT NULL,
    categorie     VARCHAR(40)  CHECK (categorie IN ('moteur','pneumatique','freinage','hydraulique','electrique','transmission','autre')),
    unite         VARCHAR(20),
    marque        VARCHAR(60),
    prix_unitaire NUMERIC(10,2),
    stock         INTEGER      NOT NULL DEFAULT 0,
    actif         BOOLEAN      NOT NULL DEFAULT true,
    cree_par      BIGINT       REFERENCES users(id),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 4. types_intervention (lookup, seeded in V3)
CREATE TABLE types_intervention (
    id      SMALLSERIAL PRIMARY KEY,
    libelle VARCHAR(60) UNIQUE NOT NULL
);

-- 5. vehicules (master registry, all types)
CREATE TABLE vehicules (
    id                 BIGSERIAL   PRIMARY KEY,
    code               VARCHAR(20) UNIQUE NOT NULL,
    type               VARCHAR(30) NOT NULL
                           CHECK (type IN ('camion','chariot','chargeur','semi_remorque','voiture','bus','balayeuse','pick_up')),
    marque             VARCHAR(60) NOT NULL,
    modele             VARCHAR(60) NOT NULL DEFAULT '',
    matricule          VARCHAR(20) UNIQUE,
    n_chassis          VARCHAR(40) UNIQUE,
    annee              SMALLINT    CHECK (annee BETWEEN 1990 AND 2100),
    carburant          VARCHAR(20) CHECK (carburant IN ('gasoil','essence','electrique','hybride')),
    statut             VARCHAR(20) NOT NULL DEFAULT 'in-service'
                           CHECK (statut IN ('in-service','workshop','maintenance','out-of-service')),
    date_mise_service  DATE,
    compteur_km        INTEGER     NOT NULL DEFAULT 0,
    compteur_heures    INTEGER     NOT NULL DEFAULT 0,
    chauffeur_prenom   VARCHAR(50),
    chauffeur_nom      VARCHAR(50),
    photo_url          TEXT,
    actif              BOOLEAN     NOT NULL DEFAULT true,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. camions (joined-table inheritance, type='camion' only)
CREATE TABLE camions (
    vehicule_id                    BIGINT       PRIMARY KEY REFERENCES vehicules(id) ON DELETE CASCADE,
    capacite_tonnes                NUMERIC(6,2),
    config_axle                    VARCHAR(20)  CHECK (config_axle IN ('4x2','6x4','plateau-2x2')),
    visite_tech_tracteur_expiration DATE,
    visite_tech_semi_expiration    DATE,
    carnet_circulation_expiration  DATE,
    metrologie_expiration          DATE,
    extincteur_expiration          DATE,
    batterie_modele                VARCHAR(60),
    batterie_date_achat            DATE,
    batterie_date_controle         DATE,
    conso_gasoil_litres_mois       NUMERIC(8,2),
    created_at                     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. pneus
CREATE TABLE pneus (
    id               BIGSERIAL   PRIMARY KEY,
    vehicule_id      BIGINT      NOT NULL REFERENCES vehicules(id),
    position         SMALLINT    NOT NULL,
    composant_id     BIGINT      REFERENCES composants(id),
    n_serie          VARCHAR(40),
    marque           VARCHAR(40),
    date_montage     DATE,
    km_montage       INTEGER,
    km_parcourus     INTEGER     NOT NULL DEFAULT 0,
    expected_life_km INTEGER     NOT NULL DEFAULT 60000,
    km_restant       INTEGER     GENERATED ALWAYS AS (expected_life_km - km_parcourus) STORED,
    pression_psi     NUMERIC(4,1),
    profondeur_32e   SMALLINT,
    status           VARCHAR(10) NOT NULL DEFAULT 'ok'
                         CHECK (status IN ('ok','warn','empty')),
    actif            BOOLEAN     NOT NULL DEFAULT true,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. pneu_inspections
CREATE TABLE pneu_inspections (
    id              BIGSERIAL   PRIMARY KEY,
    pneu_id         BIGINT      NOT NULL REFERENCES pneus(id),
    date_inspection TIMESTAMPTZ NOT NULL DEFAULT now(),
    tire_meter      INT,
    activity        VARCHAR(30) NOT NULL
                        CHECK (activity IN ('Installed','Tread Depth Reading','Inspection','Rotation','Replaced')),
    user_id         BIGINT      REFERENCES users(id),
    pression_psi    NUMERIC(4,1),
    profondeur_32e  SMALLINT,
    methode         VARCHAR(20),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. suivi_vidanges
CREATE TABLE suivi_vidanges (
    id                       BIGSERIAL   PRIMARY KEY,
    vehicule_id              BIGINT      NOT NULL REFERENCES vehicules(id),
    composant_id             BIGINT      REFERENCES composants(id),
    intervalle_nbh           INT         NOT NULL,
    compteur_nbh_actuel      INT         NOT NULL DEFAULT 0,
    nbh_restant              INT         GENERATED ALWAYS AS (intervalle_nbh - (compteur_nbh_actuel % intervalle_nbh)) STORED,
    date_dernier_entretien   DATE,
    prochain_entretien_estime DATE,
    statut                   VARCHAR(15) NOT NULL DEFAULT 'a_faire'
                                 CHECK (statut IN ('a_faire','en_cours','fait','depasse')),
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. imports_historique
CREATE TABLE imports_historique (
    id            BIGSERIAL   PRIMARY KEY,
    user_id       BIGINT      REFERENCES users(id),
    fichier       VARCHAR(255),
    type          VARCHAR(30) CHECK (type IN ('excel_general','releves_compteurs','migration')),
    lignes_total  INT,
    lignes_ok     INT,
    lignes_erreur INT,
    rapport_url   TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. releves_compteur (source of truth for km/heures)
CREATE TABLE releves_compteur (
    id              BIGSERIAL   PRIMARY KEY,
    vehicule_id     BIGINT      NOT NULL REFERENCES vehicules(id),
    date_releve     TIMESTAMPTZ NOT NULL DEFAULT now(),
    compteur_km     INT,
    compteur_heures INT,
    source          VARCHAR(20) CHECK (source IN ('manual','excel_import','intervention')),
    import_id       BIGINT      REFERENCES imports_historique(id),
    created_by      BIGINT      REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. demandes_achat
CREATE TABLE demandes_achat (
    id               BIGSERIAL   PRIMARY KEY,
    code             VARCHAR(20) UNIQUE NOT NULL,
    date_demande     TIMESTAMPTZ NOT NULL DEFAULT now(),
    demandeur_id     BIGINT      NOT NULL REFERENCES users(id),
    composant_id     BIGINT      REFERENCES composants(id),
    piece_libre      VARCHAR(120),
    reference        VARCHAR(40),
    quantite         INTEGER     NOT NULL DEFAULT 1,
    motif            TEXT,
    urgence          VARCHAR(10) CHECK (urgence IN ('Haute','Moyenne','Basse')),
    fournisseur_id   BIGINT      REFERENCES fournisseurs(id),
    statut           VARCHAR(15) NOT NULL DEFAULT 'Nouvelle'
                         CHECK (statut IN ('Nouvelle','Approuvée','Rejetée','Clôturée')),
    approbateur_id   BIGINT      REFERENCES users(id),
    date_approbation TIMESTAMPTZ,
    raison_rejet     TEXT,
    bon_commande_url TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. interventions
CREATE TABLE interventions (
    id                  BIGSERIAL    PRIMARY KEY,
    vehicule_id         BIGINT       NOT NULL REFERENCES vehicules(id),
    type_id             SMALLINT     NOT NULL REFERENCES types_intervention(id),
    composant_id        BIGINT       REFERENCES composants(id),
    categorie           VARCHAR(15)  NOT NULL
                            CHECK (categorie IN ('preventive','corrective','depannage','controle')),
    partie              VARCHAR(60),
    n_bs                VARCHAR(30),
    date_debut          TIMESTAMPTZ  NOT NULL,
    date_fin            TIMESTAMPTZ,
    temps_heures        NUMERIC(6,2),
    cout_pieces         NUMERIC(10,2) NOT NULL DEFAULT 0,
    cout_main_oeuvre    NUMERIC(10,2) NOT NULL DEFAULT 0,
    cout_sous_traitance NUMERIC(10,2) NOT NULL DEFAULT 0,
    cout_total          NUMERIC(10,2) GENERATED ALWAYS AS (cout_pieces + cout_main_oeuvre + cout_sous_traitance) STORED,
    observations        TEXT,
    demande_achat_id    BIGINT       REFERENCES demandes_achat(id),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 14. notifications
CREATE TABLE notifications (
    id            BIGSERIAL   PRIMARY KEY,
    user_id       BIGINT      REFERENCES users(id),
    vehicule_id   BIGINT      REFERENCES vehicules(id),
    severite      VARCHAR(15) CHECK (severite IN ('critical','warning','info','success')),
    categorie     VARCHAR(20) CHECK (categorie IN ('seuil_pneu','seuil_nbh','seuil_expiration','demande_achat','systeme','ai_chat')),
    titre         VARCHAR(120) NOT NULL,
    detail        TEXT,
    target_screen VARCHAR(30),
    target_id     BIGINT,
    lu            BOOLEAN     NOT NULL DEFAULT false,
    email_envoye  BOOLEAN     NOT NULL DEFAULT false,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. ai_embeddings (pgvector)
CREATE TABLE ai_embeddings (
    id           BIGSERIAL    PRIMARY KEY,
    source_table VARCHAR(40)  NOT NULL,
    source_id    BIGINT       NOT NULL,
    contenu      TEXT         NOT NULL,
    embedding    vector(384)  NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);
