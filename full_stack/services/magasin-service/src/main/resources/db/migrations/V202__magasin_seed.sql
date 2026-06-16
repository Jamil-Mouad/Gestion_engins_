-- V202 — seed the main tank (provisional capacity, editable in the admin screen;
-- arrivals observed in the Excel are 15 000–17 000 L). Barème starts empty and
-- is filled by the admin from the client's calibration table.
INSERT INTO citerne (nom, capacite_litres, densite_kg_par_litre, stock_initial_litres, stock_initial_date)
VALUES ('Citerne principale', 20000.00, 0.845, 0, DATE '2025-01-01');
