import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { canViewFactionPage } from "@/lib/permissions";
import {
  getAllMachines,
  getAllMemberMachines,
  getMemberMachineIds,
} from "@/lib/machines-data";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canViewFactionPage(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const [machines, ownerships] = await Promise.all([
      getAllMachines(),
      getAllMemberMachines(),
    ]);

    const myMachineIds = user.member
      ? Array.from(await getMemberMachineIds(user.member.id))
      : [];

    return NextResponse.json({
      machines,
      ownerships,
      my_machine_ids: myMachineIds,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur" },
      { status: 500 }
    );
  }
}
