import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasPermission } from "@/lib/permissions";
import type { PermissionKey } from "@/types";

const createRoleSchema = z.object({
  faction_id: z.string().uuid(),
  name: z.string().min(2).max(32),
  permissions: z.array(z.string()),
});

const updateRoleSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(32).optional(),
  permissions: z.array(z.string()).optional(),
});

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(user.permissions, "roles.view", user.is_super_admin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const factionId = searchParams.get("faction_id");

  const supabase = createAdminClient();
  let query = supabase.from("roles").select("*").order("name");

  if (factionId) {
    query = query.eq("faction_id", factionId);
  } else if (!user.is_super_admin && user.member?.faction_id) {
    query = query.eq("faction_id", user.member.faction_id);
  }

  const { data: roles, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = [];
  for (const role of roles ?? []) {
    const { data: perms } = await supabase
      .from("role_permissions")
      .select("permission_key")
      .eq("role_id", role.id);
    result.push({
      ...role,
      permissions: perms?.map((p) => p.permission_key) ?? [],
    });
  }

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(user.permissions, "roles.manage", user.is_super_admin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createRoleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  if (
    !user.is_super_admin &&
    user.member?.faction_id !== parsed.data.faction_id
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createAdminClient();
  const { data: role, error } = await supabase
    .from("roles")
    .insert({
      faction_id: parsed.data.faction_id,
      name: parsed.data.name,
      is_system: false,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Ce rôle existe déjà" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (parsed.data.permissions.length > 0) {
    await supabase.from("role_permissions").insert(
      parsed.data.permissions.map((p) => ({
        role_id: role.id,
        permission_key: p,
      }))
    );
  }

  return NextResponse.json({ ...role, permissions: parsed.data.permissions });
}

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(user.permissions, "roles.manage", user.is_super_admin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateRoleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("roles")
    .select("*")
    .eq("id", parsed.data.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Rôle introuvable" }, { status: 404 });
  }

  if (
    !user.is_super_admin &&
    user.member?.faction_id !== existing.faction_id
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (existing.is_system && parsed.data.name) {
    return NextResponse.json(
      { error: "Impossible de renommer un rôle système" },
      { status: 400 }
    );
  }

  if (parsed.data.name) {
    await supabase
      .from("roles")
      .update({ name: parsed.data.name })
      .eq("id", parsed.data.id);
  }

  if (parsed.data.permissions) {
    await supabase
      .from("role_permissions")
      .delete()
      .eq("role_id", parsed.data.id);

    if (parsed.data.permissions.length > 0) {
      await supabase.from("role_permissions").insert(
        parsed.data.permissions.map((p) => ({
          role_id: parsed.data.id,
          permission_key: p as PermissionKey,
        }))
      );
    }
  }

  const { data: perms } = await supabase
    .from("role_permissions")
    .select("permission_key")
    .eq("role_id", parsed.data.id);

  return NextResponse.json({
    ...existing,
    name: parsed.data.name ?? existing.name,
    permissions: perms?.map((p) => p.permission_key) ?? [],
  });
}

export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user?.is_super_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID requis" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: role } = await supabase
    .from("roles")
    .select("is_system")
    .eq("id", id)
    .single();

  if (role?.is_system) {
    return NextResponse.json(
      { error: "Impossible de supprimer un rôle système" },
      { status: 400 }
    );
  }

  const { count } = await supabase
    .from("faction_members")
    .select("*", { count: "exact", head: true })
    .eq("role_id", id);

  if (count && count > 0) {
    return NextResponse.json(
      { error: "Ce rôle est encore assigné à des membres" },
      { status: 400 }
    );
  }

  await supabase.from("role_permissions").delete().eq("role_id", id);
  const { error } = await supabase.from("roles").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
