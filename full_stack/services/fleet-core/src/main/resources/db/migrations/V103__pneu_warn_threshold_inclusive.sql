-- Fix pneu status trigger: treat km_restant = 5000 as 'warn' (was strictly < 5000)
CREATE OR REPLACE FUNCTION update_pneu_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_km_restant INTEGER;
BEGIN
    v_km_restant := NEW.expected_life_km - NEW.km_parcourus;
    IF v_km_restant <= 0 THEN
        NEW.status := 'empty';
    ELSIF v_km_restant <= 5000 THEN
        NEW.status := 'warn';
    ELSE
        NEW.status := 'ok';
    END IF;
    RETURN NEW;
END;
$$;
