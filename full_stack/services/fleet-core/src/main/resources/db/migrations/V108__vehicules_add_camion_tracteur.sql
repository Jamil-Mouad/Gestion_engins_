-- V108: Extend vehicules.type CHECK to allow 'camion_tracteur'.
-- Drops ALL existing type CHECK constraints on vehicules (including PostgreSQL's
-- auto-generated 'vehicules_type_check' from V2) before adding an explicit one.

DO $$
DECLARE
    con_name TEXT;
BEGIN
    -- Drop any constraint whose name contains 'type' on the vehicules table
    FOR con_name IN
        SELECT conname FROM pg_constraint
         WHERE conrelid = 'vehicules'::regclass
           AND contype  = 'c'
           AND conname  LIKE '%type%'
    LOOP
        EXECUTE 'ALTER TABLE vehicules DROP CONSTRAINT ' || quote_ident(con_name);
    END LOOP;
END $$;

ALTER TABLE vehicules
    ADD CONSTRAINT vehicules_type_check
    CHECK (type IN ('camion','camion_tracteur','chariot','chargeur',
                    'semi_remorque','voiture','bus','balayeuse','pick_up'));
