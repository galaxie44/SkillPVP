import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, hashPassword, verifyPassword, createSessionToken, attachSessionCookie } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = changePasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: dbUser } = await supabase
    .from("users")
    .select("password_hash")
    .eq("id", user.id)
    .single();

  if (!dbUser) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  const valid = await verifyPassword(
    parsed.data.currentPassword,
    dbUser.password_hash
  );

  if (!valid) {
    return NextResponse.json(
      { error: "Mot de passe actuel incorrect" },
      { status: 401 }
    );
  }

  const password_hash = await hashPassword(parsed.data.newPassword);
  await supabase
    .from("users")
    .update({ password_hash, must_change_password: false })
    .eq("id", user.id);

  const newToken = await createSessionToken(user.id, {
    mustChangePassword: false,
  });

  const response = NextResponse.json({ success: true });
  attachSessionCookie(response, newToken);
  return response;
}
