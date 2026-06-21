import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, hashPassword } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";
import {
  createFactionUser,
} from "@/lib/users";
import { sanitizeUsername, generatePassword } from "@/lib/utils";

const createMemberSchema = z.object({
  faction_id: z.string().uuid(),
  minecraft_pseudo: z.string().min(2).max(16),
  role_id: z
    .preprocess((val) => (val === "" ? undefined : val), z.string().uuid().optional()),
  metier_id: z.string().uuid().nullable().optional(),
  metier_level: z.number().int().min(1).max(100).optional(),
});

function validationError(parsed: z.SafeParseError<unknown>) {
  const issue = parsed.error.issues[0];
  if (issue?.path[0] === "role_id") {
    return "Sélectionne un rôle valide pour cette faction";
  }
  if (issue?.path[0] === "minecraft_pseudo") {
    return "Le pseudo Minecraft doit faire entre 2 et 16 caractères";
  }
  return issue?.message ?? "Données invalides";
}

const updateMemberSchema = z.object({
  id: z.string().uuid(),
  faction_id: z.string().uuid().optional(),
  minecraft_pseudo: z.string().min(2).max(16).optional(),
  role_id: z.string().uuid().optional(),
  metier_id: z.string().uuid().nullable().optional(),
  metier_level: z.number().int().min(1).max(100).optional(),
  create_account: z.boolean().optional(),
  reset_password: z.boolean().optional(),
  user_is_active: z.boolean().optional(),
});

const memberSelect = `
  *,
  faction:factions(*),
  role:roles(*),
  metier:metiers(*),
  user:users(id, username, is_active)
`;

async function checkMemberPermission(
  action: "view" | "edit" | "invite" | "kick" | "assign"
) {
  const user = await getSessionUser();
  if (!user) return null;

  const permMap = {
    view: "members.view",
    edit: "members.edit",
    invite: "members.invite",
    kick: "members.kick",
    assign: "metiers.assign",
  } as const;

  if (
    !hasPermission(
      user.permissions,
      permMap[action],
      user.is_super_admin
    )
  ) {
    return null;
  }
  return user;
}

async function resolveRoleForFaction(
  supabase: ReturnType<typeof createAdminClient>,
  factionId: string,
  roleId?: string
): Promise<string | null> {
  if (roleId) {
    const { data: role } = await supabase
      .from("roles")
      .select("id, faction_id")
      .eq("id", roleId)
      .maybeSingle();
    if (role?.faction_id === factionId) return role.id;
  }

  const { data: membreRole } = await supabase
    .from("roles")
    .select("id")
    .eq("faction_id", factionId)
    .eq("name", "Membre")
    .maybeSingle();

  if (membreRole) return membreRole.id;

  const { data: firstRole } = await supabase
    .from("roles")
    .select("id")
    .eq("faction_id", factionId)
    .order("created_at")
    .limit(1)
    .maybeSingle();

  return firstRole?.id ?? null;
}

export async function GET() {
  const user = await checkMemberPermission("view");
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createAdminClient();
  let query = supabase
    .from("faction_members")
    .select(memberSelect)
    .order("minecraft_pseudo");

  if (!user.is_super_admin && user.member?.faction_id) {
    query = query.eq("faction_id", user.member.faction_id);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user?.is_super_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createMemberSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: validationError(parsed) },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const resolvedRoleId = await resolveRoleForFaction(
    supabase,
    parsed.data.faction_id,
    parsed.data.role_id
  );

  if (!resolvedRoleId) {
    return NextResponse.json(
      { error: "Aucun rôle disponible pour cette faction" },
      { status: 400 }
    );
  }

  const username = sanitizeUsername(parsed.data.minecraft_pseudo);
  const plainPassword = generatePassword();
  let createdUser: { id: string; username: string };

  try {
    createdUser = await createFactionUser({
      username,
      password: plainPassword,
      createdBy: user.id,
      mustChangePassword: true,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "USERNAME_TAKEN") {
      return NextResponse.json(
        { error: "Ce nom d'utilisateur existe déjà" },
        { status: 409 }
      );
    }
    console.error("Create user for member error:", err);
    return NextResponse.json({ error: "Erreur création compte" }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("faction_members")
    .insert({
      faction_id: parsed.data.faction_id,
      minecraft_pseudo: parsed.data.minecraft_pseudo,
      role_id: resolvedRoleId,
      metier_id: parsed.data.metier_id ?? null,
      metier_level: parsed.data.metier_level ?? 1,
      user_id: createdUser.id,
    })
    .select(memberSelect)
    .single();

  if (error) {
    await supabase.from("users").delete().eq("id", createdUser.id);
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Ce pseudo existe déjà dans cette faction" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity({
    actorUsername: user.username,
    action: "member_added",
    targetPseudo: data.minecraft_pseudo,
    factionSlug: data.faction?.slug,
    message: `${user.username} a ajouté ${data.minecraft_pseudo} avec le compte ${createdUser.username}`,
    details: {
      metier: data.metier?.name,
      role: data.role?.name,
      username: createdUser.username,
    },
  });

  await logActivity({
    actorUsername: user.username,
    action: "user_created",
    message: `${user.username} a créé le compte ${createdUser.username}`,
    details: { username: createdUser.username },
  });

  revalidateTag("members");
  revalidateTag("activities");

  return NextResponse.json({
    ...data,
    plainPassword,
    createdUsername: createdUser.username,
  });
}

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updateMemberSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: validationError(parsed) },
      { status: 400 }
    );
  }

  const needsEdit =
    parsed.data.minecraft_pseudo !== undefined ||
    parsed.data.role_id !== undefined ||
    parsed.data.faction_id !== undefined;

  const needsAssign =
    parsed.data.metier_id !== undefined ||
    parsed.data.metier_level !== undefined;

  const needsAccount = parsed.data.create_account === true;
  const needsResetPassword = parsed.data.reset_password === true;
  const needsUserStatus = parsed.data.user_is_active !== undefined;

  if (
    (needsEdit || needsResetPassword || needsUserStatus) &&
    !hasPermission(user.permissions, "members.edit", user.is_super_admin)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (needsAssign && !hasPermission(user.permissions, "metiers.assign", user.is_super_admin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (needsAccount && !user.is_super_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (parsed.data.faction_id !== undefined && !user.is_super_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createAdminClient();

  const { data: existingMember } = await supabase
    .from("faction_members")
    .select("faction_id, user_id, minecraft_pseudo")
    .eq("id", parsed.data.id)
    .single();

  if (!existingMember) {
    return NextResponse.json({ error: "Membre introuvable" }, { status: 404 });
  }

  if (!user.is_super_admin && existingMember.faction_id !== user.member?.faction_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let plainPassword: string | undefined;
  let createdUsername: string | undefined;
  let userId = existingMember.user_id;

  if (needsAccount) {
    if (existingMember.user_id) {
      return NextResponse.json(
        { error: "Ce membre a déjà un compte lié" },
        { status: 409 }
      );
    }

    const username = sanitizeUsername(
      parsed.data.minecraft_pseudo ?? existingMember.minecraft_pseudo
    );
    const resolved = generatePassword();

    try {
      const createdUser = await createFactionUser({
        username,
        password: resolved,
        createdBy: user.id,
        mustChangePassword: true,
      });
      userId = createdUser.id;
      plainPassword = resolved;
      createdUsername = createdUser.username;

      await logActivity({
        actorUsername: user.username,
        action: "user_created",
        message: `${user.username} a créé le compte ${createdUser.username} pour ${existingMember.minecraft_pseudo}`,
        details: { username: createdUser.username },
      });
    } catch (err) {
      if (err instanceof Error && err.message === "USERNAME_TAKEN") {
        return NextResponse.json(
          { error: "Ce nom d'utilisateur existe déjà" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: "Erreur création compte" }, { status: 500 });
    }
  }

  if (needsResetPassword) {
    if (!existingMember.user_id) {
      return NextResponse.json(
        { error: "Aucun compte lié à ce joueur" },
        { status: 400 }
      );
    }
    const newPass = generatePassword();
    const { error: resetError } = await supabase
      .from("users")
      .update({
        password_hash: await hashPassword(newPass),
        must_change_password: true,
      })
      .eq("id", existingMember.user_id);

    if (resetError) {
      console.error("Reset password error:", resetError);
      return NextResponse.json(
        { error: "Échec de la réinitialisation du mot de passe" },
        { status: 500 }
      );
    }

    plainPassword = newPass;
    const { data: linkedUser } = await supabase
      .from("users")
      .select("username")
      .eq("id", existingMember.user_id)
      .single();
    createdUsername = linkedUser?.username;

    await logActivity({
      actorUsername: user.username,
      action: "user_reset_password",
      message: `${user.username} a réinitialisé le mot de passe de ${linkedUser?.username ?? existingMember.minecraft_pseudo}`,
    });
  }

  if (needsUserStatus && existingMember.user_id) {
    await supabase
      .from("users")
      .update({ is_active: parsed.data.user_is_active })
      .eq("id", existingMember.user_id);
  }

  const {
    id,
    create_account,
    reset_password,
    user_is_active,
    faction_id: newFactionId,
    ...updates
  } = parsed.data;

  const patchData: Record<string, unknown> = { ...updates };

  if (newFactionId && newFactionId !== existingMember.faction_id) {
    const resolvedRole = await resolveRoleForFaction(
      supabase,
      newFactionId,
      parsed.data.role_id
    );
    if (!resolvedRole) {
      return NextResponse.json(
        { error: "Aucun rôle disponible dans la faction cible" },
        { status: 400 }
      );
    }
    patchData.faction_id = newFactionId;
    patchData.role_id = resolvedRole;
  }

  if (userId && userId !== existingMember.user_id) {
    patchData.user_id = userId;
  }

  let data;
  let error;

  if (Object.keys(patchData).length > 0) {
    const result = await supabase
      .from("faction_members")
      .update(patchData)
      .eq("id", id)
      .select(memberSelect)
      .single();
    data = result.data;
    error = result.error;
  } else {
    const result = await supabase
      .from("faction_members")
      .select(memberSelect)
      .eq("id", id)
      .single();
    data = result.data;
    error = result.error;
  }

  if (error) {
    if (userId && userId !== existingMember.user_id) {
      await supabase.from("users").delete().eq("id", userId);
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const isMetierChange =
    parsed.data.metier_id !== undefined ||
    parsed.data.metier_level !== undefined;

  const isFactionMove =
    newFactionId !== undefined && newFactionId !== existingMember.faction_id;

  if (needsEdit || needsAssign || needsAccount || isFactionMove) {
    await logActivity({
      actorUsername: user.username,
      action: isMetierChange ? "metier_changed" : "member_updated",
      targetPseudo: data.minecraft_pseudo,
      factionSlug: data.faction?.slug,
      message: isFactionMove
        ? `${user.username} a déplacé ${data.minecraft_pseudo} vers ${data.faction?.name}`
        : needsAccount
          ? `${user.username} a lié le compte ${createdUsername} à ${data.minecraft_pseudo}`
          : isMetierChange
            ? `${user.username} a changé le métier de ${data.minecraft_pseudo} → ${data.metier?.name ?? "—"}`
            : `${user.username} a modifié ${data.minecraft_pseudo}`,
      details: {
        metier: data.metier?.name,
        role: data.role?.name,
        faction: data.faction?.name,
      },
    });
  }

  revalidateTag("members");
  revalidateTag("activities");

  return NextResponse.json({
    ...data,
    ...(plainPassword
      ? {
          plainPassword,
          createdUsername:
            createdUsername ?? data.user?.username ?? undefined,
        }
      : {}),
  });
}

export async function DELETE(request: Request) {
  const user = await checkMemberPermission("kick");
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID requis" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: toDelete } = await supabase
    .from("faction_members")
    .select("minecraft_pseudo, user_id, faction:factions(slug, name)")
    .eq("id", id)
    .maybeSingle();

  if (!user.is_super_admin) {
    const { data: existing } = await supabase
      .from("faction_members")
      .select("faction_id")
      .eq("id", id)
      .single();

    if (existing?.faction_id !== user.member?.faction_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { error } = await supabase.from("faction_members").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (toDelete?.user_id) {
    await supabase.from("users").delete().eq("id", toDelete.user_id);
  }

  if (toDelete) {
    const faction = toDelete.faction as unknown as {
      slug: string;
      name: string;
    } | null;
    await logActivity({
      actorUsername: user.username,
      action: "member_removed",
      targetPseudo: toDelete.minecraft_pseudo,
      factionSlug: faction?.slug,
      message: `${user.username} a retiré ${toDelete.minecraft_pseudo} (${faction?.name ?? ""})`,
    });
  }

  revalidateTag("members");
  revalidateTag("activities");

  return NextResponse.json({ success: true });
}
