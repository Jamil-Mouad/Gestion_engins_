ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password_reset_token            VARCHAR(64),
    ADD COLUMN IF NOT EXISTS password_reset_token_expires_at TIMESTAMPTZ;
