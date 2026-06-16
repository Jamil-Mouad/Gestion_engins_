-- V114 — Scope composants per vehicle type.
-- A NULL vehicule_type means the node (and its subtree) is a shared baseline visible
-- for every vehicle type; a non-null value scopes it to that specific type
-- (camion, camion_tracteur, semi_remorque, balayeuse, voiture, …).
-- All previously-seeded nodes (V3 + V113) keep vehicule_type = NULL and stay shared.

ALTER TABLE composants ADD COLUMN IF NOT EXISTS vehicule_type VARCHAR(30);

CREATE INDEX IF NOT EXISTS idx_composants_vehicule_type ON composants (vehicule_type);
