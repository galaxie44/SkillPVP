import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  Faction,
  FactionMemberWithRelations,
  FactionStats,
  Metier,
} from "@/types";

export async function getFactions(): Promise<Faction[]> {
  return unstable_cache(
    async () => {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from("factions")
        .select("*")
        .order("slug");
      return data ?? [];
    },
    ["factions-list"],
    { revalidate: 300 }
  )();
}

export async function getMetiers(): Promise<Metier[]> {
  return unstable_cache(
    async () => {
      const supabase = createAdminClient();
      const { data } = await supabase.from("metiers").select("*").order("name");
      return data ?? [];
    },
    ["metiers-list"],
    { revalidate: 300 }
  )();
}

async function _getAllMembersUncached(): Promise<FactionMemberWithRelations[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("faction_members")
    .select(
      `
      *,
      faction:factions(*),
      role:roles(*),
      metier:metiers(*),
      user:users(id, username, is_active)
    `
    )
    .order("minecraft_pseudo");

  return (data as FactionMemberWithRelations[]) ?? [];
}

export async function getAllMembers(): Promise<FactionMemberWithRelations[]> {
  return _getAllMembersUncached();
}

export async function getFactionStats(
  slug: string
): Promise<FactionStats | null> {
  const supabase = createAdminClient();
  const { data: faction } = await supabase
    .from("factions")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!faction) return null;

  const { data: members } = await supabase
    .from("faction_members")
    .select(
      `
      *,
      faction:factions(*),
      role:roles(*),
      metier:metiers(*),
      user:users(id, username, is_active)
    `
    )
    .eq("faction_id", faction.id)
    .order("minecraft_pseudo");

  const memberList = (members as FactionMemberWithRelations[]) ?? [];
  const metierMap = new Map<string, { name: string; count: number; icon: string }>();

  for (const m of memberList) {
    const name = m.metier?.name ?? "Aucune tâche";
    const icon = m.metier?.icon ?? "help-circle";
    const existing = metierMap.get(name);
    if (existing) {
      existing.count++;
    } else {
      metierMap.set(name, { name, count: 1, icon });
    }
  }

  return {
    faction,
    memberCount: memberList.length,
    metierBreakdown: Array.from(metierMap.values()),
    members: memberList,
  };
}

export async function getAllFactionStats(): Promise<FactionStats[]> {
  const factions = await getFactions();
  const stats = await Promise.all(
    factions.map((f) => getFactionStats(f.slug))
  );
  return stats.filter((s): s is FactionStats => s !== null);
}

export async function getRolesByFaction(factionId: string) {
  const supabase = createAdminClient();
  const { data: roles } = await supabase
    .from("roles")
    .select("*")
    .eq("faction_id", factionId)
    .order("name");

  if (!roles) return [];

  const result = [];
  for (const role of roles) {
    const { data: perms } = await supabase
      .from("role_permissions")
      .select("permission_key")
      .eq("role_id", role.id);
    result.push({
      ...role,
      permissions: perms?.map((p) => p.permission_key) ?? [],
    });
  }
  return result;
}

export async function getAllUsers() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("users")
    .select("id, username, is_super_admin, is_active, must_change_password, created_at")
    .order("username");
  return data ?? [];
}

export async function getRecentActivities() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}
