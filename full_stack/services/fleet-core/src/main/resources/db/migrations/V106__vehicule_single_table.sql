-- V106: Collapse JOINED inheritance (vehicules/camions) to SINGLE_TABLE.
--
-- Rationale: InheritanceType.JOINED forces a LEFT OUTER JOIN on every
-- vehicule read.  Moving camion-specific columns directly into vehicules
-- eliminates that join and makes the paginated list query cheaper.
--
-- Steps:
--   1. Add all camion-specific columns to vehicules (nullable)
--   2. Copy data from camions → vehicules
--   3. Revert process_releve() to the simple V4-style (reads/writes vehicules)
--   4. Drop camions table (cascades its triggers automatically)
--   5. Add composite index used by the list query

-- ── 1. Add camion-specific columns to vehicules ───────────────────────────────

ALTER TABLE vehicules
    ADD COLUMN IF NOT EXISTS capacite_tonnes                NUMERIC(6,2),
    ADD COLUMN IF NOT EXISTS config_axle                    VARCHAR(20)
                                 CHECK (config_axle IN ('4x2','6x4','plateau-2x2')),
    ADD COLUMN IF NOT EXISTS visite_tech_tracteur_expiration DATE,
    ADD COLUMN IF NOT EXISTS visite_tech_semi_expiration     DATE,
    ADD COLUMN IF NOT EXISTS carnet_circulation_expiration   DATE,
    ADD COLUMN IF NOT EXISTS metrologie_expiration           DATE,
    ADD COLUMN IF NOT EXISTS extincteur_expiration           DATE,
    ADD COLUMN IF NOT EXISTS batterie_modele                 VARCHAR(60),
    ADD COLUMN IF NOT EXISTS batterie_date_achat             DATE,
    ADD COLUMN IF NOT EXISTS batterie_date_controle          DATE,
    ADD COLUMN IF NOT EXISTS conso_gasoil_litres_mois        NUMERIC(8,2),
    ADD COLUMN IF NOT EXISTS compteur_km                     INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS compteur_heures                 INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS chauffeur_prenom                VARCHAR(50),
    ADD COLUMN IF NOT EXISTS chauffeur_nom                   VARCHAR(50);

-- ── 2. Copy camion data from camions → vehicules ──────────────────────────────

UPDATE vehicules v
   SET capacite_tonnes                 = c.capacite_tonnes,
       config_axle                     = c.config_axle,
       visite_tech_tracteur_expiration  = c.visite_tech_tracteur_expiration,
       visite_tech_semi_expiration      = c.visite_tech_semi_expiration,
       carnet_circulation_expiration    = c.carnet_circulation_expiration,
       metrologie_expiration            = c.metrologie_expiration,
       extincteur_expiration            = c.extincteur_expiration,
       batterie_modele                  = c.batterie_modele,
       batterie_date_achat              = c.batterie_date_achat,
       batterie_date_controle           = c.batterie_date_controle,
       conso_gasoil_litres_mois         = c.conso_gasoil_litres_mois,
       compteur_km                      = c.compteur_km,
       compteur_heures                  = c.compteur_heures,
       chauffeur_prenom                 = c.chauffeur_prenom,
       chauffeur_nom                    = c.chauffeur_nom
  FROM camions c
 WHERE c.vehicule_id = v.id;

-- ── 3. Revert process_releve() to simple vehicules-based counters ─────────────
-- Now all vehicles have master counters in vehicules, no camion-specific branch.

CREATE OR REPLACE FUNCTION process_releve()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    prev_km     INT;
    prev_heures INT;
    delta_km    INT;
    delta_h     INT;
BEGIN
    SELECT compteur_km, compteur_heures
      INTO prev_km, prev_heures
      FROM vehicules
     WHERE id = NEW.vehicule_id;

    delta_km := GREATEST(0, COALESCE(NEW.compteur_km,     prev_km)     - COALESCE(prev_km,     0));
    delta_h  := GREATEST(0, COALESCE(NEW.compteur_heures, prev_heures) - COALESCE(prev_heures, 0));

    UPDATE vehicules
       SET compteur_km     = CASE WHEN NEW.compteur_km     IS NOT NULL THEN NEW.compteur_km     ELSE compteur_km     END,
           compteur_heures = CASE WHEN NEW.compteur_heures IS NOT NULL THEN NEW.compteur_heures ELSE compteur_heures END
     WHERE id = NEW.vehicule_id;

    IF delta_km > 0 THEN
        UPDATE pneus
           SET km_parcourus = km_parcourus + delta_km
         WHERE vehicule_id = NEW.vehicule_id
           AND actif = true;
    END IF;

    IF delta_h > 0 THEN
        UPDATE suivi_vidanges
           SET compteur_nbh_actuel = compteur_nbh_actuel + delta_h
         WHERE vehicule_id = NEW.vehicule_id;
    END IF;

    RETURN NEW;
END;
$$;

-- ── 4. Drop camions table (automatically drops its triggers) ──────────────────

DROP TABLE IF EXISTS camions;

-- ── 5. Composite index for list query (actif + type + statut filters) ─────────

CREATE INDEX IF NOT EXISTS idx_vehicules_actif_type_statut
    ON vehicules (actif, type, statut);
