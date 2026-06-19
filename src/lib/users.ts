import { createAdminClient } from "@/lib/supabase/admin";
import { hashPassword } from "@/lib/auth";
import { generatePassword } from "@/lib/utils";

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

export function resolveMemberPassword(
  password?: string,
  generatePasswordFlag?: boolean
): string | null {
  if (password) return password;
  if (generatePasswordFlag) return generatePassword();
  return null;
}

export function getPublicAvatarUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  return `${base}/storage/v1/object/public/avatars/${path}`;
}
