-- Nouvelle tâche : Build base
INSERT INTO metiers (name, icon) VALUES
  ('Build base', 'hammer')
ON CONFLICT (name) DO UPDATE SET icon = EXCLUDED.icon;
