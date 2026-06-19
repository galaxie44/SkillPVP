import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyFactionAdmins, notifyAllFactionAdmins } from "@/lib/objectives";

const schema = z.object({
  objective_id: z.string().uuid(),
  quantity: z.number().int().min(1).max(999999),
});

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!user.member) {
    return NextResponse.json({ error: "Aucun membre lié" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: objective } = await supabase
    .from("faction_objectives")
    .select("id, faction_id, item_name, objective_type, is_shared")
    .eq("id", parsed.data.objective_id)
    .maybeSingle();

  if (!objective) {
    return NextResponse.json({ error: "Objectif introuvable" }, { status: 404 });
  }

  if (objective.objective_type === "metier_level") {
    return NextResponse.json(
      { error: "Seul un admin peut mettre à jour un objectif de niveau métier" },
      { status: 403 }
    );
  }

  const canSubmit =
    objective.is_shared || user.member.faction_id === objective.faction_id;

  if (!canSubmit) {
    return NextResponse.json(
      { error: "Cet objectif n'appartient pas à ta faction" },
      { status: 403 }
    );
  }

  const { data, error } = await supabase
    .from("objective_submissions")
    .insert({
      objective_id: parsed.data.objective_id,
      member_id: user.member.id,
      quantity: parsed.data.quantity,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (objective.is_shared) {
    await notifyAllFactionAdmins({
      type: "objective_submitted",
      title: "Contribution à valider",
      message: `${user.member.minecraft_pseudo} a déclaré +${parsed.data.quantity} ${objective.item_name}`,
      relatedSubmissionId: data.id,
    });
  } else {
    await notifyFactionAdmins(objective.faction_id, {
      type: "objective_submitted",
      title: "Contribution à valider",
      message: `${user.member.minecraft_pseudo} a déclaré +${parsed.data.quantity} ${objective.item_name}`,
      relatedSubmissionId: data.id,
    });
  }

  return NextResponse.json(data);
}
