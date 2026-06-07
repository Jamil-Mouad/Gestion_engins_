-- ============================================================
-- V3 — Lookup seeds: types_intervention, composants N1, dev user
-- ============================================================

-- 16 intervention types (canonical from TYP INTERV sheet; plan.md said 17 — real count is 16)
INSERT INTO types_intervention (libelle) VALUES
    ('Amélioration'),
    ('Changement'),
    ('Confection'),
    ('Contrôle'),
    ('Démontage'),
    ('Dépannage'),
    ('Diagnostic'),
    ('Montage'),
    ('Préparation'),
    ('Purge'),
    ('Rectification'),
    ('Réglage'),
    ('Essai'),
    ('Rénovation'),
    ('Réparation'),
    ('Vidange')
ON CONFLICT (libelle) DO NOTHING;

-- composants N1 catalogue roots
INSERT INTO composants (niveau, designation, categorie) VALUES
    (1, 'Moteur',        'moteur'),
    (1, 'Pneumatique',   'pneumatique'),
    (1, 'Freinage',      'freinage'),
    (1, 'Hydraulique',   'hydraulique'),
    (1, 'Électrique',    'electrique'),
    (1, 'Transmission',  'transmission'),
    (1, 'Autre',         'autre')
ON CONFLICT DO NOTHING;

-- dev admin user — seeded here so FK columns are satisfiable during import
-- password_hash is bcrypt of "admin" — CHANGE IN PRODUCTION
INSERT INTO users (email, password_hash, prenom, nom, fonction, site)
VALUES (
    'admin@intersig.local',
    '$2a$12$NI3OJxF7s/gVqRvxHwYZVOMPqWakLCxb1j5m9VGzBDfMGDvvUb8La',
    'Admin',
    'INTERSIG',
    'Responsable Maintenance',
    'Casablanca'
) ON CONFLICT (email) DO NOTHING;

-- second dev user — required so approbateur (user 2) exists in DA approval tests
INSERT INTO users (email, password_hash, prenom, nom, fonction, site)
VALUES (
    'manager@intersig.local',
    '$2a$12$NI3OJxF7s/gVqRvxHwYZVOMPqWakLCxb1j5m9VGzBDfMGDvvUb8La',
    'Manager',
    'INTERSIG',
    'Chef Maintenance',
    'Casablanca'
) ON CONFLICT (email) DO NOTHING;
