-- ============================================================
-- V4 — Trigger functions and trigger definitions
-- ============================================================

-- -----------------------------------------------------------
-- Generic updated_at maintenance
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN
        SELECT unnest(ARRAY[
            'users','fournisseurs','composants','vehicules','camions',
            'pneus','pneu_inspections','suivi_vidanges','imports_historique',
            'releves_compteur','demandes_achat','interventions',
            'notifications','ai_embeddings'
        ])
    LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_%s_updated_at
             BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
            tbl, tbl
        );
    END LOOP;
END;
$$;

-- -----------------------------------------------------------
-- camions type check — parent vehicule must be type='camion'
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION check_camion_type()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    vtype TEXT;
BEGIN
    SELECT type INTO vtype FROM vehicules WHERE id = NEW.vehicule_id;
    IF vtype <> 'camion' THEN
        RAISE EXCEPTION
            'vehicule % has type %, not camion — cannot insert into camions',
            NEW.vehicule_id, vtype;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_camions_typecheck
BEFORE INSERT OR UPDATE ON camions
FOR EACH ROW EXECUTE FUNCTION check_camion_type();

-- -----------------------------------------------------------
-- pneu status update based on km_restant
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION update_pneu_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_km_restant INTEGER;
BEGIN
    v_km_restant := NEW.expected_life_km - NEW.km_parcourus;
    IF v_km_restant <= 0 THEN
        NEW.status := 'empty';
    ELSIF v_km_restant < 5000 THEN
        NEW.status := 'warn';
    ELSE
        NEW.status := 'ok';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pneu_status
BEFORE UPDATE ON pneus
FOR EACH ROW EXECUTE FUNCTION update_pneu_status();

-- -----------------------------------------------------------
-- releves_compteur cascade:
--   1. update vehicules.compteur_km / compteur_heures
--   2. increment pneus.km_parcourus by Δkm
--   3. increment suivi_vidanges.compteur_nbh_actuel by Δheures
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION process_releve()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    prev_km     INT;
    prev_heures INT;
    delta_km    INT;
    delta_h     INT;
BEGIN
    -- read previous counters
    SELECT compteur_km, compteur_heures
      INTO prev_km, prev_heures
      FROM vehicules
     WHERE id = NEW.vehicule_id;

    -- km delta (NULL-safe: if new value is NULL or not greater, delta is 0)
    delta_km := GREATEST(0, COALESCE(NEW.compteur_km, prev_km) - COALESCE(prev_km, 0));
    delta_h  := GREATEST(0, COALESCE(NEW.compteur_heures, prev_heures) - COALESCE(prev_heures, 0));

    -- 1. update master counters
    UPDATE vehicules
       SET compteur_km     = CASE WHEN NEW.compteur_km     IS NOT NULL THEN NEW.compteur_km     ELSE compteur_km     END,
           compteur_heures = CASE WHEN NEW.compteur_heures IS NOT NULL THEN NEW.compteur_heures ELSE compteur_heures END
     WHERE id = NEW.vehicule_id;

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

CREATE TRIGGER trg_releve_pneus
AFTER INSERT ON releves_compteur
FOR EACH ROW EXECUTE FUNCTION process_releve();
