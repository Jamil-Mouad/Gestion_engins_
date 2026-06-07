-- V117: free-text worker name (separate from the authenticated admin user)
--       and proof/archive photo for purchase requests
ALTER TABLE demandes_achat ADD COLUMN IF NOT EXISTS demandeur_nom VARCHAR(150);
ALTER TABLE demandes_achat ADD COLUMN IF NOT EXISTS photo_url     VARCHAR(500);
