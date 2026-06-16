ALTER TABLE notifications
    DROP CONSTRAINT IF EXISTS notifications_categorie_check;

ALTER TABLE notifications
    ADD CONSTRAINT notifications_categorie_check
        CHECK (categorie IN ('seuil_pneu','seuil_nbh','seuil_expiration','demande_achat','systeme','ai_chat','vidange_depasse'));
