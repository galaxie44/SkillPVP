-- Nettoyage : notes joueurs, notes machines, photos de profil

ALTER TABLE faction_members DROP COLUMN IF EXISTS notes;
ALTER TABLE member_machines DROP COLUMN IF EXISTS notes;
ALTER TABLE users DROP COLUMN IF EXISTS avatar_url;

UPDATE permissions
SET label = 'Modifier pseudo, métier'
WHERE key = 'members.edit';

DELETE FROM storage.objects WHERE bucket_id = 'avatars';
DELETE FROM storage.buckets WHERE id = 'avatars';

DROP POLICY IF EXISTS "Avatars public read" ON storage.objects;
