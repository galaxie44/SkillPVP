import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getSessionUser,
  hashPassword,
  requireSuperAdmin,
} from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { generatePassword, sanitizeUsername } from "@/lib/utils";
import { logActivity } from "@/lib/activity";

const createUserSchema = z.object({
  username: z.string().min(3).max(32),
  password: z.string().min(6).optional(),
  generatePassword: z.boolean().optional(),
  must_change_password: z.boolean().optional(),
  linkMemberId: z.string().uuid().optional(),
});

const updateUserSchema = z.object({
  id: z.string().uuid(),
  is_active: z.boolean().optional(),
  must_change_password: z.boolean().optional(),
  newPassword: z.string().min(6).optional(),
});

export async function GET() {
  try {
    await requireSuperAdmin();
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("users")
      .select(
        "id, username, is_super_admin, is_active, must_change_password, created_at"
      )
      .order("username");

    if (error) throw error;
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireSuperAdmin();
    const body = await request.json();
    const parsed = createUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const plainPassword =
      parsed.data.password ??
      (parsed.data.generatePassword ? generatePassword() : null);

    if (!plainPassword) {
      return NextResponse.json(
        { error: "Mot de passe requis" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const password_hash = await hashPassword(plainPassword);

    const { data: user, error } = await supabase
      .from("users")
      .insert({
        username: sanitizeUsername(parsed.data.username),
        password_hash,
        is_super_admin: false,
        must_change_password: parsed.data.must_change_password ?? true,
        created_by: admin.id,
      })
      .select("id, username, is_active, must_change_password, created_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Ce nom d'utilisateur existe déjà" },
          { status: 409 }
        );
      }
      throw error;
    }

    if (parsed.data.linkMemberId) {
      await supabase
        .from("faction_members")
        .update({ user_id: user.id })
        .eq("id", parsed.data.linkMemberId);
    }

    await logActivity({
      actorUsername: admin.username,
      action: "user_created",
      message: `${admin.username} a créé le compte ${user.username}`,
      details: { username: user.username },
    });

    return NextResponse.json({
      user,
      plainPassword,
    });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireSuperAdmin();
    const body = await request.json();
    const parsed = updateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const updates: Record<string, unknown> = {};

    if (parsed.data.is_active !== undefined) {
      updates.is_active = parsed.data.is_active;
    }
    if (parsed.data.must_change_password !== undefined) {
      updates.must_change_password = parsed.data.must_change_password;
    }
    if (parsed.data.newPassword) {
      updates.password_hash = await hashPassword(parsed.data.newPassword);
      updates.must_change_password = true;
    }

    const { data, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", parsed.data.id)
      .select("id, username, is_active, must_change_password")
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    const response: Record<string, unknown> = { user: data };
    if (parsed.data.newPassword) {
      response.plainPassword = parsed.data.newPassword;
      await logActivity({
        actorUsername: admin.username,
        action: "user_reset_password",
        message: `${admin.username} a réinitialisé le mot de passe de ${data.username}`,
      });
    }

    return NextResponse.json(response);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await requireSuperAdmin();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const supabase = createAdminClient();
    await supabase.from("faction_members").update({ user_id: null }).eq("user_id", id);
    const { error } = await supabase.from("users").delete().eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
