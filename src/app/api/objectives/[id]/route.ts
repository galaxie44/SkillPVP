import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { canManageObjective } from "@/lib/objectives";

const updateSchema = z.object({
  item_name: z.string().min(1).max(64).optional(),
  target_quantity: z.number().int().min(1).max(999999).optional(),
  approved_quantity: z.number().int().min(0).max(999999).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("faction_objectives")
    .select("*, metier:metiers(id, name)")
    .eq("id", id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Objectif introuvable" }, { status: 404 });
  }

  if (!canManageObjective(user, existing)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const patch: Record<string, unknown> = { ...parsed.data };

  if (existing.objective_type === "metier_level") {
    if (parsed.data.item_name !== undefined) {
      return NextResponse.json(
        { error: "Impossible de modifier le nom d'un objectif métier" },
        { status: 400 }
      );
    }

    const target =
      parsed.data.target_quantity ?? existing.target_quantity;
    const approved =
      parsed.data.approved_quantity ?? existing.approved_quantity;

    if (approved > target) {
      return NextResponse.json(
        { error: "Le niveau ne peut pas dépasser l'objectif" },
        { status: 400 }
      );
    }

    if (parsed.data.approved_quantity !== undefined) {
      patch.approved_quantity = parsed.data.approved_quantity;
    }
    if (parsed.data.target_quantity !== undefined) {
      patch.target_quantity = parsed.data.target_quantity;
    }
    delete patch.item_name;
  }

  const { data, error } = await supabase
    .from("faction_objectives")
    .update(patch)
    .eq("id", id)
    .select(`*, metier:metiers(id, name, icon)`)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("faction_objectives")
    .select("faction_id")
    .eq("id", id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Objectif introuvable" }, { status: 404 });
  }

  if (!canManageObjective(user, existing)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase.from("faction_objectives").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
