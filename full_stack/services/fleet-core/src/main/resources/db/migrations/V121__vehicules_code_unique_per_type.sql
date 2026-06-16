-- A camion_tracteur and its semi_remorque legitimately share ONE fleet code
-- (e.g. "438"); the CAM-/SMR- prefixes were a workaround for the global
-- UNIQUE(code). Uniqueness becomes per (code, type); n_chassis (already
-- UNIQUE since V2) is the vehicle's globally-unique identifier.

ALTER TABLE vehicules DROP CONSTRAINT IF EXISTS vehicules_code_key;
ALTER TABLE vehicules ADD CONSTRAINT vehicules_code_type_key UNIQUE (code, type);
