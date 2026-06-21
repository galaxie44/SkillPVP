import type { Machine, MemberMachine, FactionMemberWithRelations } from "@/types";

export type RegistryEntry = {
  member: FactionMemberWithRelations;
  machines: { machine: Machine; quantity: number }[];
};

export function buildMachineRegistry(
  ownerships: MemberMachine[]
): RegistryEntry[] {
  const byMember = new Map<string, RegistryEntry>();

  for (const row of ownerships) {
    if (!row.member || !row.machine) continue;
    const existing = byMember.get(row.member_id);
    const item = {
      machine: row.machine,
      quantity: row.quantity,
    };
    if (existing) {
      existing.machines.push(item);
    } else {
      byMember.set(row.member_id, {
        member: row.member as FactionMemberWithRelations,
        machines: [item],
      });
    }
  }

  return Array.from(byMember.values()).sort((a, b) =>
    a.member.minecraft_pseudo.localeCompare(b.member.minecraft_pseudo)
  );
}
