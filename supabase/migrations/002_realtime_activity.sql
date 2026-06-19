-- Activity log + Realtime

CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_username TEXT NOT NULL,
  action TEXT NOT NULL,
  target_pseudo TEXT,
  faction_slug TEXT,
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_activity" ON activity_log
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "anon_read_members" ON faction_members
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "service_all_activity" ON activity_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Realtime: activer la réplication
ALTER TABLE faction_members REPLICA IDENTITY FULL;
ALTER TABLE activity_log REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE faction_members;
ALTER PUBLICATION supabase_realtime ADD TABLE activity_log;
