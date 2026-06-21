import { isFactionAdmin } from "@/lib/permissions";
import type { FactionObjective, SessionUser } from "@/types";

export function canManageObjective(
  user: SessionUser,
  objective: { faction_id: string; is_shared?: boolean }
): boolean {
  if (user.is_super_admin) return true;
  if (!isFactionAdmin(user) || !user.member) return false;
  if (objective.is_shared) return true;
  return user.member.faction_id === objective.faction_id;
}

export function getObjectiveLabel(obj: FactionObjective): string {
  if (obj.objective_type === "metier_level" && obj.metier) {
    return `Monter niveau ${obj.target_quantity} ${obj.metier.name}`;
  }
  return obj.item_name ?? "Objectif";
}

export function isMetierLevelObjective(obj: FactionObjective): boolean {
  return obj.objective_type === "metier_level";
}
