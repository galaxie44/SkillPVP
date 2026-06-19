-- Types d'objectifs : item (joueur déclare) ou metier_level (admin seul)

ALTER TABLE faction_objectives
  ADD COLUMN IF NOT EXISTS objective_type TEXT NOT NULL DEFAULT 'item'
    CHECK (objective_type IN ('item', 'metier_level')),
  ADD COLUMN IF NOT EXISTS metier_id UUID REFERENCES metiers(id) ON DELETE SET NULL;

ALTER TABLE faction_objectives ALTER COLUMN item_name DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_faction_objectives_metier ON faction_objectives(metier_id);
