import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification, canManageObjective } from "@/lib/objectives";

const schema = z.object({
  submission_id: z.string().uuid(),
  action: z.enum(["approve", "reject"]),
  review_note: z.string().max(500).optional(),
});

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: submission } = await supabase
    .from("objective_submissions")
    .select(
      `
      *,
      objective:faction_objectives(id, faction_id, item_name, target_quantity, approved_quantity, member_id, is_shared),
      member:faction_members(id, minecraft_pseudo, user_id)
    `
    )
    .eq("id", parsed.data.submission_id)
    .maybeSingle();

  if (!submission || submission.status !== "pending") {
    return NextResponse.json({ error: "Soumission introuvable" }, { status: 404 });
  }

  const objective = submission.objective as {
    id: string;
    faction_id: string;
    item_name: string;
    target_quantity: number;
    approved_quantity: number;
    is_shared?: boolean;
  };

  if (!canManageObjective(user, objective)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const submitterMember = submission.member as {
    id: string;
    user_id: string | null;
    minecraft_pseudo: string;
  };

  if (
    user.member?.id === submitterMember.id ||
    user.id === submitterMember.user_id
  ) {
    return NextResponse.json(
      { error: "Tu ne peux pas valider ta propre contribution" },
      { status: 403 }
    );
  }

  const approved = parsed.data.action === "approve";
  const newStatus = approved ? "approved" : "rejected";

  const { error: updateError } = await supabase
    .from("objective_submissions")
    .update({
      status: newStatus,
      reviewed_by: user.id,
      review_note: parsed.data.review_note ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.submission_id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (approved) {
    const newQty = Math.min(
      objective.approved_quantity + submission.quantity,
      objective.target_quantity
    );
    await supabase
      .from("faction_objectives")
      .update({ approved_quantity: newQty })
      .eq("id", objective.id);
  }

  const member = submission.member as {
    user_id: string | null;
    minecraft_pseudo: string;
  };

  if (member.user_id) {
    await createNotification({
      userId: member.user_id,
      type: approved ? "objective_approved" : "objective_rejected",
      title: approved ? "Contribution acceptée" : "Contribution refusée",
      message: approved
        ? `+${submission.quantity} ${objective.item_name} validé par ${user.username}`
        : `+${submission.quantity} ${objective.item_name} refusé${parsed.data.review_note ? ` : ${parsed.data.review_note}` : ""}`,
      relatedSubmissionId: parsed.data.submission_id,
    });
  }

  return NextResponse.json({ success: true, status: newStatus });
}
