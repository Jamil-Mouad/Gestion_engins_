ALTER TABLE notifications
    ADD COLUMN email_sent_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_dedup
    ON notifications (user_id, categorie, target_id, created_at DESC);
