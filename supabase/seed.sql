-- Seed: permissions
INSERT INTO permissions (key, label) VALUES
  ('members.view', 'Voir la liste des membres'),
  ('members.edit', 'Modifier pseudo, métier'),
  ('members.invite', 'Ajouter un membre'),
  ('members.kick', 'Retirer un membre'),
  ('roles.view', 'Voir les rôles'),
  ('roles.manage', 'Créer/modifier rôles et permissions'),
  ('faction.stats', 'Voir stats globales faction'),
  ('metiers.view', 'Voir répartition métiers'),
  ('metiers.assign', 'Changer le métier d''un membre')
ON CONFLICT (key) DO NOTHING;

-- Seed: tâches disponibles
INSERT INTO metiers (name, icon) VALUES
  ('Agriculteur', 'wheat'),
  ('Mineur', 'pickaxe'),
  ('Chasseur', 'crosshair'),
  ('Ingénieur', 'wrench'),
  ('Cuisinier', 'chef-hat'),
  ('Bijoutier', 'gem'),
  ('Combatant', 'swords'),
  ('Éleveur', 'paw-print'),
  ('Build base', 'hammer')
ON CONFLICT (name) DO NOTHING;

-- Seed: factions v1 et v2
INSERT INTO factions (name, slug) VALUES
  ('Faction v1', 'v1'),
  ('Faction v2', 'v2')
ON CONFLICT (slug) DO NOTHING;

-- Helper: create system roles for each faction
DO $$
DECLARE
  f RECORD;
  recrue_id UUID;
  membre_id UUID;
  admin_id UUID;
BEGIN
  FOR f IN SELECT id FROM factions WHERE slug IN ('v1', 'v2') LOOP
    -- Recrue
    INSERT INTO roles (faction_id, name, is_system)
    VALUES (f.id, 'Recrue', true)
    ON CONFLICT (faction_id, name) DO NOTHING
    RETURNING id INTO recrue_id;
    IF recrue_id IS NULL THEN
      SELECT id INTO recrue_id FROM roles WHERE faction_id = f.id AND name = 'Recrue';
    END IF;

    -- Membre
    INSERT INTO roles (faction_id, name, is_system)
    VALUES (f.id, 'Membre', true)
    ON CONFLICT (faction_id, name) DO NOTHING
    RETURNING id INTO membre_id;
    IF membre_id IS NULL THEN
      SELECT id INTO membre_id FROM roles WHERE faction_id = f.id AND name = 'Membre';
    END IF;

    -- AdminFaction
    INSERT INTO roles (faction_id, name, is_system)
    VALUES (f.id, 'AdminFaction', true)
    ON CONFLICT (faction_id, name) DO NOTHING
    RETURNING id INTO admin_id;
    IF admin_id IS NULL THEN
      SELECT id INTO admin_id FROM roles WHERE faction_id = f.id AND name = 'AdminFaction';
    END IF;

    -- Recrue permissions
    INSERT INTO role_permissions (role_id, permission_key) VALUES
      (recrue_id, 'members.view'),
      (recrue_id, 'metiers.view'),
      (recrue_id, 'faction.stats')
    ON CONFLICT DO NOTHING;

    -- Membre permissions
    INSERT INTO role_permissions (role_id, permission_key) VALUES
      (membre_id, 'members.view'),
      (membre_id, 'metiers.view'),
      (membre_id, 'faction.stats')
    ON CONFLICT DO NOTHING;

    -- AdminFaction permissions (création de joueurs réservée au super admin)
    INSERT INTO role_permissions (role_id, permission_key)
    SELECT admin_id, key FROM permissions
    WHERE key != 'members.invite'
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;
