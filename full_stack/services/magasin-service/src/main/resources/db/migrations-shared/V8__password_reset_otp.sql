ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password_reset_otp            VARCHAR(6),
    ADD COLUMN IF NOT EXISTS password_reset_otp_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS password_reset_otp_used_at    TIMESTAMPTZ;