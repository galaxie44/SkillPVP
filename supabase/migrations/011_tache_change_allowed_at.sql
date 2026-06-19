-- Date/heure à partir de laquelle le joueur peut rechanger de tâche

ALTER TABLE faction_members
  ADD COLUMN IF NOT EXISTS tache_change_allowed_at TIMESTAMPTZ;
