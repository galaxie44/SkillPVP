-- Catalogue de machines + déclarations par joueur (visible v1 & v2)

CREATE TABLE machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'Général',
  icon TEXT NOT NULL DEFAULT 'cog',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE member_machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES faction_members(id) ON DELETE CASCADE,
  machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity >= 1 AND quantity <= 99),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (member_id, machine_id)
);

CREATE INDEX idx_member_machines_member ON member_machines(member_id);
CREATE INDEX idx_member_machines_machine ON member_machines(machine_id);

CREATE TRIGGER member_machines_updated_at
  BEFORE UPDATE ON member_machines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_machines ENABLE ROW LEVEL SECURITY;

INSERT INTO machines (name, description, category, icon, sort_order) VALUES
  ('Foreuse auto', 'Extraction automatique de minerais', 'Ressources', 'pickaxe', 1),
  ('Ferme auto', 'Culture et récolte automatique', 'Ressources', 'wheat', 2),
  ('Pêche auto', 'Pêche automatisée', 'Ressources', 'fish', 3),
  ('Élevage auto', 'Ferme à mobs / animaux', 'Ressources', 'paw-print', 4),
  ('Four industriel', 'Cuisson / fusion accélérée', 'Production', 'flame', 5),
  ('Broyeur', 'Broyage de minerais et matériaux', 'Production', 'hammer', 6),
  ('Compresseur', 'Compression de ressources', 'Production', 'compress', 7),
  ('Générateur', 'Production d''énergie', 'Énergie', 'zap', 8),
  ('Réseau stockage', 'Système de stockage centralisé (AE/RS)', 'Stockage', 'database', 9),
  ('Enchantement auto', 'Table / enclume automatisée', 'Utilitaire', 'sparkles', 10),
  ('Usine traitement', 'Chaîne de traitement complète', 'Production', 'factory', 11),
  ('Spawner contrôlé', 'Farm de mobs contrôlée', 'Ressources', 'skull', 12)
ON CONFLICT (name) DO NOTHING;
