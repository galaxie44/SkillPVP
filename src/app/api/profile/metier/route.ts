import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity";
import {
  formatCooldown,
  getTacheCooldownRemaining,
  nextTacheChangeAllowedAt,
} from "@/lib/metiers";

const schema = z.object({
  metier_id: z.string().uuid().nullable(),
});

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!user.member) {
    return NextResponse.json(
      { error: "Aucun membre de faction lié" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const newMetierId = parsed.data.metier_id;
  const currentMetierId = user.member.metier_id ?? null;

  if (newMetierId === currentMetierId) {
    return NextResponse.json({
      member: user.member,
      tache_change_allowed_at: user.member.tache_change_allowed_at ?? null,
    });
  }

  const cooldownLeft = getTacheCooldownRemaining(
    user.member.tache_change_allowed_at
  );
  if (cooldownLeft > 0 && !user.is_super_admin) {
    return NextResponse.json(
      {
        error: `Tu pourras changer de tâche dans ${formatCooldown(cooldownLeft)}`,
        tache_change_allowed_at: user.member.tache_change_allowed_at,
      },
      { status: 429 }
    );
  }

  const supabase = createAdminClient();

  if (newMetierId) {
    const { data: metier } = await supabase
      .from("metiers")
      .select("id, name")
      .eq("id", newMetierId)
      .maybeSingle();

    if (!metier) {
      return NextResponse.json({ error: "Tâche introuvable" }, { status: 404 });
    }
  }

  const allowedAt = nextTacheChangeAllowedAt();

  const { data, error } = await supabase
    .from("faction_members")
    .update({
      metier_id: newMetierId,
      tache_changed_at: new Date().toISOString(),
      tache_change_allowed_at: allowedAt,
    })
    .eq("id", user.member.id)
    .select("*, metier:metiers(*), faction:factions(*)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity({
    actorUsername: user.username,
    action: "metier_changed",
    targetPseudo: user.member.minecraft_pseudo,
    factionSlug: user.member.faction?.slug,
    message: newMetierId
      ? `${user.username} a rejoint la tâche ${data.metier?.name}`
      : `${user.username} n'est plus assigné à une tâche`,
    details: { metier: data.metier?.name },
  });

  return NextResponse.json({
    member: data,
    tache_change_allowed_at: allowedAt,
  });
}
