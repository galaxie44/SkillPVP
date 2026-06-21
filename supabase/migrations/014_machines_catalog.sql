-- Catalogue machines SkillPVP (remplace l'ancienne liste)

DELETE FROM member_machines;
DELETE FROM machines;

INSERT INTO machines (name, description, category, icon, sort_order) VALUES
  ('Machine de renfo', 'Renforcement d''équipement', 'Machines', 'hammer', 1),
  ('Cooker', 'Cuisson automatisée', 'Machines', 'flame', 2),
  ('Fusionneur', 'Fusion de minerais et alliages', 'Machines', 'factory', 3),
  ('Table de craft avancée', 'Fabrication avancée', 'Machines', 'layers', 4),
  ('Table d''enchantement avancée', 'Enchantement automatisé', 'Machines', 'sparkles', 5),
  ('Raffinerie', 'Raffinage de ressources', 'Machines', 'factory', 6),
  ('Puits de pétrole', 'Extraction de pétrole', 'Machines', 'droplet', 7),
  ('Collecteur', 'Collecte automatique de ressources', 'Machines', 'database', 8),
  ('Finder Machine', 'Détection et repérage de ressources', 'Machines', 'search', 9),
  ('Assembleur', 'Assemblage de composants', 'Machines', 'cog', 10),
  ('Foreuse', 'Forage / extraction minière', 'Machines', 'pickaxe', 11),
  ('Recycleur', 'Recyclage de matériaux', 'Machines', 'recycle', 12),
  ('Magmacine', 'Traitement de magma / lave', 'Machines', 'flame', 13);
