import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { canViewFactionPage, canEditFaction, isFactionAdmin } from "@/lib/permissions";
import {
  getObjectivesByFaction,
  getPendingSubmissionsByFaction,
  enrichObjectivesWithPending,
  canManageObjective,
} from "@/lib/objectives";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const factionId = new URL(request.url).searchParams.get("faction_id");
  if (!factionId) {
    return NextResponse.json({ error: "faction_id requis" }, { status: 400 });
  }

  const canView =
    user.is_super_admin ||
    user.member?.faction_id === factionId ||
    canViewFactionPage(user);

  if (!canView) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const rawObjectives = await getObjectivesByFaction(factionId);
    const objectives = await enrichObjectivesWithPending(rawObjectives, factionId);
    const canManageFaction =
      user.is_super_admin ||
      (canEditFaction(user, factionId) && isFactionAdmin(user));

    const pending =
      isFactionAdmin(user) || user.is_super_admin
        ? (await getPendingSubmissionsByFaction(factionId)).filter((sub) => {
            const obj = sub.objective as {
              faction_id: string;
              is_shared?: boolean;
            };
            return (
              obj &&
              canManageObjective(user, obj)
            );
          })
        : [];

    return NextResponse.json({ objectives, pending, canManageFaction });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur" },
      { status: 500 }
    );
  }
}

const createItemSchema = z.object({
  objective_type: z.literal("item"),
  faction_id: z.string().uuid(),
  item_name: z.string().min(1).max(64),
  target_quantity: z.number().int().min(1).max(999999),
  is_shared: z.boolean().optional(),
});

const createMetierSchema = z.object({
  objective_type: z.literal("metier_level"),
  faction_id: z.string().uuid(),
  metier_id: z.string().uuid(),
  target_quantity: z.number().int().min(1).max(100),
  approved_quantity: z.number().int().min(0).max(100).optional(),
  is_shared: z.boolean().optional(),
});

const createSchema = z.discriminatedUnion("objective_type", [
  createItemSchema,
  createMetierSchema,
]);

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const { faction_id } = parsed.data;

  const canManage =
    user.is_super_admin ||
    (canEditFaction(user, faction_id) && isFactionAdmin(user));

  if (!canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createAdminClient();
  const isShared = parsed.data.is_shared ?? false;
  let insertData: Record<string, unknown>;

  if (parsed.data.objective_type === "item") {
    insertData = {
      objective_type: "item",
      faction_id,
      member_id: null,
      item_name: parsed.data.item_name,
      target_quantity: parsed.data.target_quantity,
      is_shared: isShared,
      created_by: user.id,
    };
  } else {
    const { data: metier } = await supabase
      .from("metiers")
      .select("id, name")
      .eq("id", parsed.data.metier_id)
      .maybeSingle();

    if (!metier) {
      return NextResponse.json({ error: "Tâche introuvable" }, { status: 404 });
    }

    const currentLevel = parsed.data.approved_quantity ?? 0;
    if (currentLevel > parsed.data.target_quantity) {
      return NextResponse.json(
        { error: "Le niveau actuel ne peut pas dépasser l'objectif" },
        { status: 400 }
      );
    }

    insertData = {
      objective_type: "metier_level",
      faction_id,
      member_id: null,
      metier_id: parsed.data.metier_id,
      item_name: null,
      target_quantity: parsed.data.target_quantity,
      approved_quantity: currentLevel,
      is_shared: isShared,
      created_by: user.id,
    };
  }

  const { data, error } = await supabase
    .from("faction_objectives")
    .insert(insertData)
    .select(`*, metier:metiers(id, name, icon)`)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
