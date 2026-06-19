import type {
  Faction,
  FactionMemberWithRelations,
  FactionStats,
} from "@/types";

export function computeFactionStats(
  faction: Faction,
  allMembers: FactionMemberWithRelations[]
): FactionStats {
  const members = allMembers.filter((m) => m.faction_id === faction.id);
  const metierMap = new Map<
    string,
    { name: string; count: number; icon: string }
  >();

  for (const m of members) {
    const name = m.metier?.name ?? "Aucune tâche";
    const icon = m.metier?.icon ?? "help-circle";
    const existing = metierMap.get(name);
    if (existing) existing.count++;
    else metierMap.set(name, { name, count: 1, icon });
  }

  return {
    faction,
    memberCount: members.length,
    metierBreakdown: Array.from(metierMap.values()),
    members,
  };
}

export function computeAllFactionStats(
  factions: Faction[],
  members: FactionMemberWithRelations[]
): FactionStats[] {
  return factions.map((f) => computeFactionStats(f, members));
}
