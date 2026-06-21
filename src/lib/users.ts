import { createAdminClient } from "@/lib/supabase/admin";
import { hashPassword } from "@/lib/auth";

export async function createFactionUser(params: {
  username: string;
  password: string;
  createdBy: string;
  mustChangePassword?: boolean;
}): Promise<{ id: string; username: string }> {
  const supabase = createAdminClient();
  const password_hash = await hashPassword(params.password);

  const { data, error } = await supabase
    .from("users")
    .insert({
      username: params.username,
      password_hash,
      is_super_admin: false,
      must_change_password: params.mustChangePassword ?? true,
      created_by: params.createdBy,
    })
    .select("id, username")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("USERNAME_TAKEN");
    }
    throw error;
  }

  return data;
}
