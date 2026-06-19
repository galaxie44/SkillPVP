import { NextResponse } from "next/server";
import { bootstrapSuperAdmin } from "@/lib/auth";

export async function POST() {
  try {
    await bootstrapSuperAdmin();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Bootstrap error:", error);
    return NextResponse.json(
      { error: "Bootstrap failed" },
      { status: 500 }
    );
  }
}
