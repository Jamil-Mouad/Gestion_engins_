-- V10: Move compteur_km, compteur_heures, chauffeur_prenom, chauffeur_nom
--      from vehicules to camions.
--
-- Rationale: These 4 columns are semantically camion-specific.
--   - Counters (km/hours) are tracked only for trucks in this fleet.
--   - Driver assignment (chauffeur) is only relevant for trucks.
--   Non-camion vehicles (chariots, etc.) do not require these fields.
--
-- Trigger impact: process_releve() is rewritten to read/write camions
-- instead of vehicules for the master counter state.

-- ── Step 1: Add columns to camions ───────────────────────────────────────────

ALTER TABLE camions
    ADD COLUMN compteur_km      INTEGER     NOT NULL DEFAULT 0,
    ADD COLUMN compteur_heures  INTEGER     NOT NULL DEFAULT 0,
    ADD COLUMN chauffeur_prenom VARCHAR(50),
    ADD COLUMN chauffeur_nom    VARCHAR(50);

-- ── Step 2: Migrate existing data from vehicules → camions ───────────────────

UPDATE camions c
   SET compteur_km      = v.compteur_km,
       compteur_heures  = v.compteur_heures,
       chauffeur_prenom = v.chauffeur_prenom,
       chauffeur_nom    = v.chauffeur_nom
  FROM vehicules v
 WHERE c.vehicule_id = v.id;

-- ── Step 3: Drop columns from vehicules ──────────────────────────────────────

ALTER TABLE vehicules
    DROP COLUMN compteur_km,
    DROP COLUMN compteur_heures,
    DROP COLUMN chauffeur_prenom,
    DROP COLUMN chauffeur_nom;

-- ── Step 4: Rewrite process_releve() — counters now live in camions ──────────
--
-- For camion vehicles: reads/writes camions.compteur_km / compteur_heures.
-- For non-camion vehicles: prev_km falls back to the previous releve entry
--   (or 0 if first entry), ensuring correct delta for any tyre km updates.

CREATE OR REPLACE FUNCTION process_releve()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    prev_km     INT;
    prev_heures INT;
    delta_km    INT;
    delta_h     INT;
    is_camion   BOOLEAN;
BEGIN
    -- check if vehicle has a camion record
    SELECT EXISTS (SELECT 1 FROM camions WHERE vehicule_id = NEW.vehicule_id)
      INTO is_camion;

    IF is_camion THEN
        -- camion path: master counters stored in camions
        SELECT compteur_km, compteur_heures
          INTO prev_km, prev_heures
          FROM camions
         WHERE vehicule_id = NEW.vehicule_id;
    ELSE
        -- non-camion path: use previous releve as baseline (NULL → 0 for first entry)
        SELECT COALESCE(compteur_km, 0), COALESCE(compteur_heures, 0)
          INTO prev_km, prev_heures
          FROM releves_compteur
         WHERE vehicule_id = NEW.vehicule_id
           AND id < NEW.id
         ORDER BY date_releve DESC, id DESC
         LIMIT 1;
        prev_km     := COALESCE(prev_km, 0);
        prev_heures := COALESCE(prev_heures, 0);
    END IF;

    -- compute deltas (NULL-safe; negative delta clamped to 0)
    delta_km := GREATEST(0, COALESCE(NEW.compteur_km, prev_km) - prev_km);
    delta_h  := GREATEST(0, COALESCE(NEW.compteur_heures, prev_heures) - prev_heures);

    -- 1. update master counters in camions (no-op for non-camion vehicles)
    IF is_camion THEN
        UPDATE camions
           SET compteur_km     = CASE WHEN NEW.compteur_km     IS NOT NULL
                                      THEN NEW.compteur_km     ELSE compteur_km     END,
               compteur_heures = CASE WHEN NEW.compteur_heures IS NOT NULL
                                      THEN NEW.compteur_heures ELSE compteur_heures END
         WHERE vehicule_id = NEW.vehicule_id;
    END IF;

    -- 2. propagate km delta to all active tyres
    IF delta_km > 0 THEN
        UPDATE pneus
           SET km_parcourus = km_parcourus + delta_km
         WHERE vehicule_id = NEW.vehicule_id
           AND actif = true;
    END IF;

    -- 3. propagate hours delta to oil/filter service records
    IF delta_h > 0 THEN
        UPDATE suivi_vidanges
           SET compteur_nbh_actuel = compteur_nbh_actuel + delta_h
         WHERE vehicule_id = NEW.vehicule_id;
    END IF;

    RETURN NEW;
END;
$$;
