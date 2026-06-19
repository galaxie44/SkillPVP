import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  machine_id: z.string().uuid(),
  owned: z.boolean(),
  quantity: z.number().int().min(1).max(99).optional(),
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

  const supabase = createAdminClient();
  const { machine_id, owned, quantity = 1 } = parsed.data;

  const { data: machine } = await supabase
    .from("machines")
    .select("id")
    .eq("id", machine_id)
    .maybeSingle();

  if (!machine) {
    return NextResponse.json({ error: "Machine introuvable" }, { status: 404 });
  }

  if (owned) {
    const { data, error } = await supabase
      .from("member_machines")
      .upsert(
        {
          member_id: user.member.id,
          machine_id,
          quantity,
        },
        { onConflict: "member_id,machine_id" }
      )
      .select("machine_id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ owned: true, machine_id: data.machine_id });
  }

  const { error } = await supabase
    .from("member_machines")
    .delete()
    .eq("member_id", user.member.id)
    .eq("machine_id", machine_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ owned: false, machine_id });
}
