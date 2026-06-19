import type { PermissionKey, SessionUser } from "@/types";

export function hasPermission(
  permissions: PermissionKey[],
  required: PermissionKey,
  isSuperAdmin = false
): boolean {
  if (isSuperAdmin) return true;
  return permissions.includes(required);
}

export function hasAnyPermission(
  permissions: PermissionKey[],
  required: PermissionKey[],
  isSuperAdmin = false
): boolean {
  if (isSuperAdmin) return true;
  return required.some((p) => permissions.includes(p));
}

export function canManageMembers(
  permissions: PermissionKey[],
  isSuperAdmin = false
): boolean {
  return hasAnyPermission(
    permissions,
    ["members.edit", "members.invite", "members.kick"],
    isSuperAdmin
  );
}

/** Page faction visible par tout membre de faction (lecture v1/v2) */
export function canViewFactionPage(user: SessionUser): boolean {
  return user.is_super_admin || !!user.member;
}

/** Modifications réservées à sa propre faction (ou super admin) */
export function canEditFaction(user: SessionUser, factionId: string): boolean {
  if (user.is_super_admin) return true;
  return user.member?.faction_id === factionId;
}

/** Admin de faction ou super admin */
export function isFactionAdmin(user: SessionUser): boolean {
  if (user.is_super_admin) return true;
  if (user.member?.role?.name === "AdminFaction") return true;
  return hasPermission(user.permissions, "objectives.manage", false);
}

/** Dashboard réservé aux admins de faction et super admin */
export function canAccessDashboard(user: SessionUser): boolean {
  return isFactionAdmin(user);
}

/** Page d'accueil après connexion */
export function getHomeRoute(user: SessionUser): string {
  if (canAccessDashboard(user)) return "/dashboard";
  if (user.member?.faction?.slug) return `/factions/${user.member.faction.slug}`;
  return "/profile";
}
