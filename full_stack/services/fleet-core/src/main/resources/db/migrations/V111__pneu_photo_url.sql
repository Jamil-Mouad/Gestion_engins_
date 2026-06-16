-- V107: Add photo_url column to pneus table
ALTER TABLE pneus
    ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500);
