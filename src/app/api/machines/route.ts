import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { canViewFactionPage } from "@/lib/permissions";
import {
  getAllMachines,
  getAllMemberMachines,
  getMemberMachineQuantities,
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

    const myMachines = user.member
      ? await getMemberMachineQuantities(user.member.id)
      : [];

    return NextResponse.json({
      machines,
      ownerships,
      my_machines: myMachines,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur" },
      { status: 500 }
    );
  }
}
