-- Objectifs au niveau faction (plus liés à un joueur précis)
ALTER TABLE faction_objectives ALTER COLUMN member_id DROP NOT NULL;

UPDATE faction_objectives SET member_id = NULL WHERE member_id IS NOT NULL;
