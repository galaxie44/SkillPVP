-- Nettoyage : notes joueurs, notes machines, photos de profil
-- (le bucket Storage "avatars" se supprime à la main : Dashboard → Storage → avatars → Delete bucket)

ALTER TABLE faction_members DROP COLUMN IF EXISTS notes;
ALTER TABLE member_machines DROP COLUMN IF EXISTS notes;
ALTER TABLE users DROP COLUMN IF EXISTS avatar_url;

UPDATE permissions
SET label = 'Modifier pseudo, métier'
WHERE key = 'members.edit';
