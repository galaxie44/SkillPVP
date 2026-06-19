-- Métiers farm : liste officielle, sans niveau

INSERT INTO metiers (name, icon) VALUES
  ('Agriculteur', 'wheat'),
  ('Mineur', 'pickaxe'),
  ('Chasseur', 'crosshair'),
  ('Ingénieur', 'wrench'),
  ('Cuisinier', 'chef-hat'),
  ('Bijoutier', 'gem'),
  ('Combatant', 'swords'),
  ('Éleveur', 'paw-print')
ON CONFLICT (name) DO UPDATE SET icon = EXCLUDED.icon;

UPDATE faction_members
SET metier_id = NULL
WHERE metier_id IN (
  SELECT id FROM metiers
  WHERE name IN ('Enchanteur', 'Bâtisseur', 'Pilleur', 'Autre')
);

DELETE FROM metiers
WHERE name IN ('Enchanteur', 'Bâtisseur', 'Pilleur', 'Autre');
