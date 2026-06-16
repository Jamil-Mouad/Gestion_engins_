-- Pneus: add a catalog « référence » field and make « n° série » a unique
-- tire identifier.
--
-- Historically n_serie held the catalog reference; the field is migrated to
-- the new `reference` column. Existing duplicate serials are suffixed
-- (-2, -3, …) so the UNIQUE constraint can be applied; n_serie stays
-- nullable at DB level (legacy rows) — "required" is enforced by the API
-- for new tires only.

ALTER TABLE pneus ADD COLUMN IF NOT EXISTS reference VARCHAR(40);

UPDATE pneus SET reference = n_serie
WHERE reference IS NULL AND n_serie IS NOT NULL;

-- headroom for the dedupe suffixes below
ALTER TABLE pneus ALTER COLUMN n_serie TYPE VARCHAR(60);

WITH d AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY n_serie ORDER BY id) AS rn
    FROM pneus
    WHERE n_serie IS NOT NULL
)
UPDATE pneus p
SET n_serie = p.n_serie || '-' || d.rn
FROM d
WHERE p.id = d.id AND d.rn > 1;

ALTER TABLE pneus ADD CONSTRAINT pneus_n_serie_key UNIQUE (n_serie);
