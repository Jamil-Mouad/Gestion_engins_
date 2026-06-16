-- Test-only compatibility shim. The live database carries fleet-core's
-- V101+ migrations, which moved compteur_km back onto vehicules (V10 had
-- moved it to camions) and added the camion_tracteur type. The magasin test
-- schema only applies the shared V1–V11, so mirror those two changes here.
-- This file lives in src/test/resources and is never packaged.
ALTER TABLE vehicules ADD COLUMN compteur_km INTEGER NOT NULL DEFAULT 0;

ALTER TABLE vehicules DROP CONSTRAINT vehicules_type_check;
ALTER TABLE vehicules ADD CONSTRAINT vehicules_type_check
    CHECK (type IN ('camion','camion_tracteur','chariot','chargeur','semi_remorque','voiture','bus','balayeuse','pick_up'));
