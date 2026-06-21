import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  FactionMemberWithRelations,
  PermissionKey,
  SessionUser,
  User,
} from "@/types";

export const SESSION_COOKIE_NAME = "skillpvp_session";
const SALT_ROUNDS = 12;

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 7,
  path: "/",
};

export function attachSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);
  return response;
}

export function clearSessionCookieOnResponse(response: NextResponse) {
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("Missing AUTH_SECRET");
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(
  userId: string,
  options?: { mustChangePassword?: boolean }
): Promise<string> {
  return new SignJWT({
    sub: userId,
    mcp: options?.mustChangePassword ? 1 : 0,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifySessionToken(
  token: string
): Promise<{ userId: string; mustChangePassword: boolean } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub) return null;
    return {
      userId: payload.sub,
      mustChangePassword: payload.mcp === 1,
    };
  } catch {
    return null;
  }
}

export async function getSessionToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value;
}

async function getMemberWithRelations(
  userId: string
): Promise<FactionMemberWithRelations | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("faction_members")
    .select(
      `
      *,
      faction:factions(*),
      role:roles(*),
      metier:metiers(*),
      user:users(id, username, is_active)
    `
    )
    .eq("user_id", userId)
    .maybeSingle();

  return data as FactionMemberWithRelations | null;
}

async function getPermissionsForUser(
  user: User,
  member: FactionMemberWithRelations | null
): Promise<PermissionKey[]> {
  if (user.is_super_admin) {
    return [
      "members.view",
      "members.edit",
      "members.invite",
      "members.kick",
      "roles.view",
      "roles.manage",
      "faction.stats",
      "metiers.view",
      "metiers.assign",
      "objectives.view",
      "objectives.manage",
    ];
  }

  if (!member?.role_id) return [];

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("role_permissions")
    .select("permission_key")
    .eq("role_id", member.role_id);

  return (data?.map((r) => r.permission_key as PermissionKey) ?? []);
}

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const token = await getSessionToken();
  if (!token) return null;

  const verified = await verifySessionToken(token);
  if (!verified) return null;

  const supabase = createAdminClient();
  const userId = verified.userId;

  const [{ data: user }, member] = await Promise.all([
    supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .eq("is_active", true)
      .maybeSingle(),
    getMemberWithRelations(userId),
  ]);

  if (!user) return null;

  const permissions = await getPermissionsForUser(user as User, member);

  return {
    id: user.id,
    username: user.username,
    is_super_admin: user.is_super_admin,
    must_change_password: user.must_change_password,
    member,
    permissions,
  };
});

export async function loginUser(
  username: string,
  password: string
): Promise<{
  success: boolean;
  error?: string;
  user?: SessionUser;
  token?: string;
}> {
  const normalizedUsername = username.trim();
  if (!normalizedUsername) {
    return { success: false, error: "Identifiants invalides" };
  }

  const supabase = createAdminClient();
  const { data: user } = await supabase
    .from("users")
    .select("*")
    .ilike("username", normalizedUsername)
    .eq("is_active", true)
    .maybeSingle();

  if (!user) {
    return { success: false, error: "Identifiants invalides" };
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return { success: false, error: "Identifiants invalides" };
  }

  const token = await createSessionToken(user.id, {
    mustChangePassword:
      user.must_change_password && !user.is_super_admin,
  });

  const member = await getMemberWithRelations(user.id);
  const permissions = await getPermissionsForUser(user as User, member);

  return {
    success: true,
    token,
    user: {
      id: user.id,
      username: user.username,
      is_super_admin: user.is_super_admin,
      must_change_password: user.must_change_password,
      member,
      permissions,
    },
  };
}

export async function bootstrapSuperAdmin(): Promise<void> {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true });

  if (count && count > 0) return;

  const username = process.env.SUPER_ADMIN_USERNAME ?? "admin";
  const password = process.env.SUPER_ADMIN_PASSWORD ?? "admin123";
  const password_hash = await hashPassword(password);

  await supabase.from("users").insert({
    username,
    password_hash,
    is_super_admin: true,
    must_change_password: true,
  });
}

export async function requireSession(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function requireSuperAdmin(): Promise<SessionUser> {
  const user = await requireSession();
  if (!user.is_super_admin) throw new Error("Forbidden");
  return user;
}
