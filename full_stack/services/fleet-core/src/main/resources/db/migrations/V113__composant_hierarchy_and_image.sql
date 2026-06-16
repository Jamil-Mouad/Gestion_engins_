-- V113 — Standard composant hierarchy (Châssis / Carrosserie / Moteur / …) + image_url column.
-- The tree nests by parent_id; depth is 3 levels max (fits the niveau BETWEEN 1 AND 3 constraint).
-- New sub-trees attach under the existing V3 roots (Moteur, Freinage, Transmission, Électrique)
-- by designation; Châssis, Carrosserie and Suspension are added as new niveau-1 roots.

-- 1. Image column (mirrors vehicule/pneu photo handling).
ALTER TABLE composants ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);

-- 2. Extend the categorie CHECK to cover the new structural systems.
ALTER TABLE composants DROP CONSTRAINT IF EXISTS composants_categorie_check;
ALTER TABLE composants ADD CONSTRAINT composants_categorie_check
    CHECK (categorie IN ('moteur','pneumatique','freinage','hydraulique','electrique',
                         'transmission','autre','chassis','carrosserie','suspension'));

-- 3. New niveau-1 roots.
INSERT INTO composants (parent_id, niveau, reference, designation, categorie) VALUES
    (NULL, 1, 'CHA', 'Châssis',     'chassis'),
    (NULL, 1, 'CAR', 'Carrosserie', 'carrosserie'),
    (NULL, 1, 'SUS', 'Suspension',  'suspension');

-- ── Helper pattern: cross-join a single parent row with a VALUES list of children. ──

-- 4. Moteur (existing root) → assemblies (niveau 2).
INSERT INTO composants (parent_id, niveau, reference, designation, categorie)
SELECT p.id, 2, v.reference, v.designation, 'moteur'
FROM (SELECT id FROM composants WHERE designation = 'Moteur' AND niveau = 1 AND parent_id IS NULL LIMIT 1) p,
     (VALUES ('MOT-BLC','Bloc moteur'), ('MOT-PST','Pistons'), ('MOT-BIE','Bielles'),
             ('MOT-VIL','Vilebrequin'), ('MOT-CUL','Culasse')) AS v(reference, designation);

-- 4b. Moteur parts (niveau 3).
INSERT INTO composants (parent_id, niveau, reference, designation, categorie)
SELECT p.id, 3, v.reference, v.designation, 'moteur'
FROM (SELECT id FROM composants WHERE reference = 'MOT-BLC') p,
     (VALUES ('MOT-BLC-CYL','Cylindres'), ('MOT-BLC-CHM','Chemises'), ('MOT-BLC-BCH','Bouchons')) AS v(reference, designation);
INSERT INTO composants (parent_id, niveau, reference, designation, categorie)
SELECT p.id, 3, v.reference, v.designation, 'moteur'
FROM (SELECT id FROM composants WHERE reference = 'MOT-PST') p,
     (VALUES ('MOT-PST-SEG','Segments'), ('MOT-PST-AXE','Axe piston'), ('MOT-PST-CIR','Circlips')) AS v(reference, designation);
INSERT INTO composants (parent_id, niveau, reference, designation, categorie)
SELECT p.id, 3, v.reference, v.designation, 'moteur'
FROM (SELECT id FROM composants WHERE reference = 'MOT-BIE') p,
     (VALUES ('MOT-BIE-COU','Coussinets'), ('MOT-BIE-VIS','Vis de bielle')) AS v(reference, designation);
INSERT INTO composants (parent_id, niveau, reference, designation, categorie)
SELECT p.id, 3, v.reference, v.designation, 'moteur'
FROM (SELECT id FROM composants WHERE reference = 'MOT-VIL') p,
     (VALUES ('MOT-VIL-PAL','Paliers'), ('MOT-VIL-ROU','Roulements')) AS v(reference, designation);
INSERT INTO composants (parent_id, niveau, reference, designation, categorie)
SELECT p.id, 3, v.reference, v.designation, 'moteur'
FROM (SELECT id FROM composants WHERE reference = 'MOT-CUL') p,
     (VALUES ('MOT-CUL-SOU','Soupapes'), ('MOT-CUL-RES','Ressorts'),
             ('MOT-CUL-GUI','Guides'), ('MOT-CUL-JOI','Joints')) AS v(reference, designation);

-- 5. Freinage (existing root) → parts (niveau 2).
INSERT INTO composants (parent_id, niveau, reference, designation, categorie)
SELECT p.id, 2, v.reference, v.designation, 'freinage'
FROM (SELECT id FROM composants WHERE designation = 'Freinage' AND niveau = 1 AND parent_id IS NULL LIMIT 1) p,
     (VALUES ('FRE-DIS','Disques'), ('FRE-PLA','Plaquettes'), ('FRE-ETR','Étriers'),
             ('FRE-PST','Pistons'), ('FRE-DUR','Durites'), ('FRE-VIS','Vis de purge')) AS v(reference, designation);

-- 6. Transmission (existing root) → parts (niveau 2).
INSERT INTO composants (parent_id, niveau, reference, designation, categorie)
SELECT p.id, 2, v.reference, v.designation, 'transmission'
FROM (SELECT id FROM composants WHERE designation = 'Transmission' AND niveau = 1 AND parent_id IS NULL LIMIT 1) p,
     (VALUES ('TRA-EMB','Embrayage'), ('TRA-BOI','Boîte de vitesses'), ('TRA-ARB','Arbres'),
             ('TRA-ROU','Roulements'), ('TRA-SPI','Joints SPI'), ('TRA-DIF','Différentiel')) AS v(reference, designation);

-- 7. Électrique (existing root) → électronique parts (niveau 2).
INSERT INTO composants (parent_id, niveau, reference, designation, categorie)
SELECT p.id, 2, v.reference, v.designation, 'electrique'
FROM (SELECT id FROM composants WHERE designation = 'Électrique' AND niveau = 1 AND parent_id IS NULL LIMIT 1) p,
     (VALUES ('ELE-BAT','Batterie'), ('ELE-FAI','Faisceau électrique'), ('ELE-CON','Connecteurs'),
             ('ELE-ECU','ECU'), ('ELE-CAP','Capteurs'), ('ELE-FUS','Fusibles')) AS v(reference, designation);

-- 8. Châssis (new root) → parts (niveau 2).
INSERT INTO composants (parent_id, niveau, reference, designation, categorie)
SELECT p.id, 2, v.reference, v.designation, 'chassis'
FROM (SELECT id FROM composants WHERE reference = 'CHA') p,
     (VALUES ('CHA-LON','Longerons'), ('CHA-TRA','Traverses'), ('CHA-SUP','Supports moteur'),
             ('CHA-BOU','Boulons'), ('CHA-ECR','Écrous'), ('CHA-RON','Rondelles')) AS v(reference, designation);

-- 9. Carrosserie (new root) → assemblies (niveau 2).
INSERT INTO composants (parent_id, niveau, reference, designation, categorie)
SELECT p.id, 2, v.reference, v.designation, 'carrosserie'
FROM (SELECT id FROM composants WHERE reference = 'CAR') p,
     (VALUES ('CAR-CAP','Capot'), ('CAR-POR','Portes'), ('CAR-PCH','Pare-chocs')) AS v(reference, designation);

-- 9b. Carrosserie parts (niveau 3).
INSERT INTO composants (parent_id, niveau, reference, designation, categorie)
SELECT p.id, 3, v.reference, v.designation, 'carrosserie'
FROM (SELECT id FROM composants WHERE reference = 'CAR-CAP') p,
     (VALUES ('CAR-CAP-CHA','Charnières'), ('CAR-CAP-VER','Vérins'),
             ('CAR-CAP-VIS','Vis de fixation'), ('CAR-CAP-JOI','Joint d''étanchéité')) AS v(reference, designation);
INSERT INTO composants (parent_id, niveau, reference, designation, categorie)
SELECT p.id, 3, v.reference, v.designation, 'carrosserie'
FROM (SELECT id FROM composants WHERE reference = 'CAR-POR') p,
     (VALUES ('CAR-POR-POI','Poignée'), ('CAR-POR-SER','Serrure'), ('CAR-POR-VIT','Vitre'),
             ('CAR-POR-MLV','Moteur lève-vitre'), ('CAR-POR-VIS','Vis')) AS v(reference, designation);

-- 10. Suspension (new root) → parts (niveau 2).
INSERT INTO composants (parent_id, niveau, reference, designation, categorie)
SELECT p.id, 2, v.reference, v.designation, 'suspension'
FROM (SELECT id FROM composants WHERE reference = 'SUS') p,
     (VALUES ('SUS-RES','Ressorts'), ('SUS-AMO','Amortisseurs'), ('SUS-BRA','Bras de suspension'),
             ('SUS-SIL','Silentblocs'), ('SUS-ROT','Rotules')) AS v(reference, designation);
