-- Objectifs par faction/joueur + soumissions + notifications

INSERT INTO permissions (key, label) VALUES
  ('objectives.view', 'Voir les objectifs'),
  ('objectives.manage', 'Gérer et valider les objectifs')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE faction_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faction_id UUID NOT NULL REFERENCES factions(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES faction_members(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  target_quantity INT NOT NULL CHECK (target_quantity > 0),
  approved_quantity INT NOT NULL DEFAULT 0 CHECK (approved_quantity >= 0),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE objective_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID NOT NULL REFERENCES faction_objectives(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES faction_members(id) ON DELETE CASCADE,
  quantity INT NOT NULL CHECK (quantity > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

CREATE TABLE user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  related_submission_id UUID REFERENCES objective_submissions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_faction_objectives_faction ON faction_objectives(faction_id);
CREATE INDEX idx_faction_objectives_member ON faction_objectives(member_id);
CREATE INDEX idx_objective_submissions_objective ON objective_submissions(objective_id);
CREATE INDEX idx_objective_submissions_status ON objective_submissions(status);
CREATE INDEX idx_user_notifications_user ON user_notifications(user_id, read);

CREATE TRIGGER faction_objectives_updated_at
  BEFORE UPDATE ON faction_objectives
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE faction_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE objective_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- Permissions rôles : tous voient, AdminFaction gère
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id, name FROM roles LOOP
    INSERT INTO role_permissions (role_id, permission_key)
    VALUES (r.id, 'objectives.view')
    ON CONFLICT DO NOTHING;

    IF r.name = 'AdminFaction' THEN
      INSERT INTO role_permissions (role_id, permission_key)
      VALUES (r.id, 'objectives.manage')
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- Retirer faction.stats aux joueurs simples (dashboard réservé aux admins)
DELETE FROM role_permissions
WHERE permission_key = 'faction.stats'
  AND role_id IN (SELECT id FROM roles WHERE name IN ('Recrue', 'Membre'));
