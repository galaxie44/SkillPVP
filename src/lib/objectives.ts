import { createAdminClient } from "@/lib/supabase/admin";
import type { FactionObjective, ObjectiveSubmission } from "@/types";

export {
  canManageObjective,
  getObjectiveLabel,
  isMetierLevelObjective,
} from "@/lib/objectives-client";

const objectiveSelect = `
  *,
  metier:metiers(id, name, icon)
`;

export async function getObjectivesByFaction(
  factionId: string
): Promise<FactionObjective[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("faction_objectives")
    .select(objectiveSelect)
    .or(`faction_id.eq.${factionId},is_shared.eq.true`)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as FactionObjective[]) ?? [];
}

async function getItemObjectiveIdsForFaction(factionId: string): Promise<string[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("faction_objectives")
    .select("id")
    .eq("objective_type", "item")
    .or(`faction_id.eq.${factionId},is_shared.eq.true`);

  return (data ?? []).map((o) => o.id);
}

export async function getPendingSubmissionsByFaction(
  factionId: string
): Promise<ObjectiveSubmission[]> {
  const objectiveIds = await getItemObjectiveIdsForFaction(factionId);
  if (!objectiveIds.length) return [];

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("objective_submissions")
    .select(
      `
      *,
      objective:faction_objectives(id, faction_id, item_name, target_quantity, approved_quantity, member_id, is_shared),
      member:faction_members(id, minecraft_pseudo, user_id)
    `
    )
    .in("objective_id", objectiveIds)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as ObjectiveSubmission[]) ?? [];
}

export async function getPendingQuantityByObjective(
  factionId: string
): Promise<Record<string, number>> {
  const objectiveIds = await getItemObjectiveIdsForFaction(factionId);
  if (!objectiveIds.length) return {};

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("objective_submissions")
    .select("objective_id, quantity")
    .in("objective_id", objectiveIds)
    .eq("status", "pending");

  if (error) throw new Error(error.message);

  const map: Record<string, number> = {};
  for (const row of data ?? []) {
    map[row.objective_id] = (map[row.objective_id] ?? 0) + row.quantity;
  }
  return map;
}

export async function enrichObjectivesWithPending(
  objectives: FactionObjective[],
  factionId: string
): Promise<FactionObjective[]> {
  const pendingMap = await getPendingQuantityByObjective(factionId);
  return objectives.map((o) => ({
    ...o,
    pending_quantity: pendingMap[o.id] ?? 0,
  }));
}

export async function notifyAllFactionAdmins(
  params: Omit<Parameters<typeof createNotification>[0], "userId">
) {
  const supabase = createAdminClient();
  const { data: factions } = await supabase.from("factions").select("id");
  for (const faction of factions ?? []) {
    await notifyFactionAdmins(faction.id, params);
  }
}

export async function createNotification(params: {
  userId: string;
  type: string;
  title: string;
  message: string;
  relatedSubmissionId?: string;
}) {
  const supabase = createAdminClient();
  await supabase.from("user_notifications").insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    related_submission_id: params.relatedSubmissionId ?? null,
  });
}

export async function notifyFactionAdmins(
  factionId: string,
  params: Omit<Parameters<typeof createNotification>[0], "userId">
) {
  const supabase = createAdminClient();
  const { data: admins } = await supabase
    .from("faction_members")
    .select("user_id, role:roles(name)")
    .eq("faction_id", factionId)
    .not("user_id", "is", null);

  for (const admin of admins ?? []) {
    const role = admin.role as unknown as { name: string } | null;
    if (role?.name === "AdminFaction" && admin.user_id) {
      await createNotification({ ...params, userId: admin.user_id });
    }
  }
}
