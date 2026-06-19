-- La création de joueurs est réservée au super admin
DELETE FROM role_permissions WHERE permission_key = 'members.invite';
