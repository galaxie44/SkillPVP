-- Objectifs communs v1/v2 + cooldown changement de tâche

ALTER TABLE faction_members
  ADD COLUMN IF NOT EXISTS tache_changed_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE faction_members
SET tache_changed_at = COALESCE(updated_at, created_at, now())
WHERE tache_changed_at IS NULL;

ALTER TABLE faction_objectives
  ADD COLUMN IF NOT EXISTS is_shared BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_faction_objectives_is_shared
  ON faction_objectives(is_shared)
  WHERE is_shared = true;
