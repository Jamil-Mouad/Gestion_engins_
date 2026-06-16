-- Métrologie: store the control (calibration) date; the expiration is the
-- control date + 2 years (auto-derived app-side, still user-editable).
ALTER TABLE vehicules ADD COLUMN IF NOT EXISTS metrologie_date_controle DATE;
