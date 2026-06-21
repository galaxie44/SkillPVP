export type PermissionKey =
  | "members.view"
  | "members.edit"
  | "members.invite"
  | "members.kick"
  | "roles.view"
  | "roles.manage"
  | "faction.stats"
  | "metiers.view"
  | "metiers.assign"
  | "objectives.view"
  | "objectives.manage";

export interface User {
  id: string;
  username: string;
  password_hash: string;
  is_super_admin: boolean;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
  created_by: string | null;
}

export interface Faction {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface Metier {
  id: string;
  name: string;
  icon: string;
  created_at: string;
}

export interface Permission {
  key: PermissionKey;
  label: string;
}

export interface Role {
  id: string;
  faction_id: string;
  name: string;
  is_system: boolean;
  created_at: string;
}

export interface RoleWithPermissions extends Role {
  permissions: PermissionKey[];
}

export interface FactionMember {
  id: string;
  faction_id: string;
  user_id: string | null;
  minecraft_pseudo: string;
  role_id: string;
  metier_id: string | null;
  metier_level: number;
  tache_changed_at?: string | null;
  tache_change_allowed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FactionMemberWithRelations extends FactionMember {
  faction?: Faction;
  role?: Role;
  metier?: Metier | null;
  user?: Pick<User, "id" | "username" | "is_active"> | null;
}

export interface SessionUser {
  id: string;
  username: string;
  is_super_admin: boolean;
  must_change_password: boolean;
  member?: FactionMemberWithRelations | null;
  permissions: PermissionKey[];
}

export interface FactionStats {
  faction: Faction;
  memberCount: number;
  metierBreakdown: { name: string; count: number; icon: string }[];
  members: FactionMemberWithRelations[];
}

export const ALL_PERMISSIONS: { key: PermissionKey; label: string }[] = [
  { key: "members.view", label: "Voir la liste des membres" },
  { key: "members.edit", label: "Modifier pseudo, métier" },
  { key: "members.invite", label: "Ajouter un membre" },
  { key: "members.kick", label: "Retirer un membre" },
  { key: "roles.view", label: "Voir les rôles" },
  { key: "roles.manage", label: "Créer/modifier rôles et permissions" },
  { key: "faction.stats", label: "Voir stats globales faction" },
  { key: "metiers.view", label: "Voir répartition métiers" },
  { key: "metiers.assign", label: "Changer le métier d'un membre" },
  { key: "objectives.view", label: "Voir les objectifs" },
  { key: "objectives.manage", label: "Gérer et valider les objectifs" },
];

export const METIER_COLORS = [
  "#f97316",
  "#22c55e",
  "#a855f7",
  "#3b82f6",
  "#ef4444",
  "#6b7280",
];

export interface ActivityLog {
  id: string;
  actor_username: string;
  action: string;
  target_pseudo: string | null;
  faction_slug: string | null;
  message: string;
  details: Record<string, unknown>;
  created_at: string;
}

export const ACTIVITY_ICONS: Record<string, string> = {
  member_added: "user-plus",
  member_updated: "pencil",
  member_removed: "user-minus",
  metier_changed: "pickaxe",
  user_created: "key",
  user_reset_password: "refresh-cw",
  objective_submitted: "package-plus",
  objective_approved: "check-circle",
  objective_rejected: "x-circle",
};

export type ObjectiveType = "item" | "metier_level";

export interface FactionObjective {
  id: string;
  faction_id: string;
  member_id: string | null;
  objective_type: ObjectiveType;
  item_name: string | null;
  metier_id: string | null;
  target_quantity: number;
  approved_quantity: number;
  is_shared: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  member?: FactionMemberWithRelations;
  metier?: Metier | null;
  pending_submissions?: ObjectiveSubmission[];
  /** Somme des soumissions en attente (items uniquement) */
  pending_quantity?: number;
}

export interface ObjectiveSubmission {
  id: string;
  objective_id: string;
  member_id: string;
  quantity: number;
  status: "pending" | "approved" | "rejected";
  reviewed_by: string | null;
  review_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  objective?: FactionObjective;
  member?: FactionMemberWithRelations;
}

export interface UserNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  related_submission_id: string | null;
  created_at: string;
}

export interface Machine {
  id: string;
  name: string;
  description: string | null;
  category: string;
  icon: string;
  sort_order: number;
  created_at: string;
}

export interface MemberMachine {
  id: string;
  member_id: string;
  machine_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  machine?: Machine;
  member?: FactionMemberWithRelations;
}
