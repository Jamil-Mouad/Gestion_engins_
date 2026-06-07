CREATE INDEX idx_interventions_vehicule_date ON interventions (vehicule_id, date_debut DESC);
CREATE INDEX idx_pneus_status               ON pneus (status) WHERE status <> 'ok';
CREATE INDEX idx_pneus_vehicule             ON pneus (vehicule_id);
CREATE INDEX idx_notifs_user_unread         ON notifications (user_id, lu, created_at DESC);
CREATE INDEX idx_demandes_achat_statut      ON demandes_achat (statut, date_demande DESC);
CREATE INDEX idx_releves_vehicule_date      ON releves_compteur (vehicule_id, date_releve DESC);
CREATE INDEX idx_ai_embeddings_ivfflat      ON ai_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- one active tyre per position per vehicle
CREATE UNIQUE INDEX idx_pneus_position_active ON pneus (vehicule_id, position) WHERE actif = true;
