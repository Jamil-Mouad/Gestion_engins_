-- Remove the Fournisseur (supplier) concept: drop the FK column from demandes_achat and drop the fournisseurs table entirely.
ALTER TABLE demandes_achat DROP COLUMN IF EXISTS fournisseur_id;
DROP TABLE IF EXISTS fournisseurs;
