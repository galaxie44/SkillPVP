import { createAdminClient } from "@/lib/supabase/admin";
import type { Machine, MemberMachine, FactionMemberWithRelations } from "@/types";

const ownershipSelect = `
  *,
  machine:machines(*),
  member:faction_members(
    id,
    minecraft_pseudo,
    faction_id,
    user_id,
    faction:factions(id, name, slug)
  )
`;

export async function getAllMachines(): Promise<Machine[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("machines")
    .select("*")
    .order("sort_order")
    .order("name");

  if (error) throw new Error(error.message);
  return (data as Machine[]) ?? [];
}

export async function getAllMemberMachines(): Promise<MemberMachine[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("member_machines")
    .select(ownershipSelect)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as MemberMachine[]) ?? [];
}

export async function getMemberMachineIds(memberId: string): Promise<Set<string>> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("member_machines")
    .select("machine_id")
    .eq("member_id", memberId);

  return new Set((data ?? []).map((r) => r.machine_id));
}

export async function getMemberMachineQuantities(
  memberId: string
): Promise<{ machine_id: string; quantity: number }[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("member_machines")
    .select("machine_id, quantity")
    .eq("member_id", memberId);

  return (data ?? []).map((r) => ({
    machine_id: r.machine_id,
    quantity: r.quantity,
  }));
}

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
