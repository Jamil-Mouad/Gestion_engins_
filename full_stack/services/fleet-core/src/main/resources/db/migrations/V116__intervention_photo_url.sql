-- V116: add photo_url column to interventions (proof/archive image of the work order)
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500);
