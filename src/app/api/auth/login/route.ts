import { NextResponse } from "next/server";
import { bootstrapSuperAdmin, loginUser, attachSessionCookie } from "@/lib/auth";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    await bootstrapSuperAdmin();
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const result = await loginUser(parsed.data.username, parsed.data.password);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    const response = NextResponse.json({ user: result.user });
    if (result.token) {
      attachSessionCookie(response, result.token);
    }
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
