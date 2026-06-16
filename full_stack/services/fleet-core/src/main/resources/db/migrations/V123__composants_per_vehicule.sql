-- Composants become PER-VEHICLE: each vehicle owns its own component tree
-- (copied from the per-type starter template), editable independently, with
-- unlimited nesting depth.
--
-- Template rows keep vehicule_id IS NULL and stay the starter template that
-- is copied to every newly created vehicle (ComposantTemplateService).

-- 1. Ownership column
ALTER TABLE composants ADD COLUMN IF NOT EXISTS vehicule_id BIGINT REFERENCES vehicules(id);
CREATE INDEX IF NOT EXISTS idx_composants_vehicule_id ON composants (vehicule_id);

-- 2. Unlimited nesting depth (was CHECK niveau BETWEEN 1 AND 3)
ALTER TABLE composants DROP CONSTRAINT IF EXISTS composants_niveau_check;
ALTER TABLE composants ADD CONSTRAINT composants_niveau_check CHECK (niveau >= 1);

-- 3. Reference uniqueness becomes per-vehicle (copies share the template's
--    reference); template rows (vehicule_id IS NULL) are not constrained.
ALTER TABLE composants DROP CONSTRAINT IF EXISTS composants_reference_key;
CREATE UNIQUE INDEX IF NOT EXISTS composants_vehicule_reference_uq
    ON composants (vehicule_id, reference)
    WHERE vehicule_id IS NOT NULL AND reference IS NOT NULL;

-- 4. Fan-out: copy the template tree to every active vehicle (only nodes
--    visible for the vehicle's type), then remap historical interventions to
--    the owning vehicle's copy. demandes_achat keep pointing at template rows
--    (historical references, documented).
CREATE TEMP TABLE comp_map (old_id BIGINT, veh_id BIGINT, new_id BIGINT);

DO $$
DECLARE
    v   RECORD;
    c   RECORD;
    new_parent BIGINT;
    nid BIGINT;
BEGIN
    FOR v IN SELECT id, type FROM vehicules WHERE actif = true ORDER BY id LOOP
        FOR c IN SELECT * FROM composants
                 WHERE vehicule_id IS NULL AND actif = true
                   AND (vehicule_type IS NULL OR vehicule_type = v.type)
                 ORDER BY niveau, id LOOP
            new_parent := NULL;
            IF c.parent_id IS NOT NULL THEN
                SELECT m.new_id INTO new_parent FROM comp_map m
                WHERE m.old_id = c.parent_id AND m.veh_id = v.id;
                IF new_parent IS NULL THEN
                    CONTINUE;  -- parent not visible for this type → skip node
                END IF;
            END IF;
            INSERT INTO composants (parent_id, niveau, reference, designation,
                                    categorie, unite, marque, prix_unitaire,
                                    stock, actif, cree_par, image_url,
                                    vehicule_type, vehicule_id)
            VALUES (new_parent, c.niveau, c.reference, c.designation,
                    c.categorie, c.unite, c.marque, c.prix_unitaire,
                    c.stock, true, c.cree_par, c.image_url,
                    c.vehicule_type, v.id)
            RETURNING id INTO nid;
            INSERT INTO comp_map VALUES (c.id, v.id, nid);
        END LOOP;
    END LOOP;

    UPDATE interventions i
    SET composant_id = m.new_id
    FROM comp_map m
    WHERE i.composant_id = m.old_id AND i.vehicule_id = m.veh_id;
END $$;

DROP TABLE comp_map;
