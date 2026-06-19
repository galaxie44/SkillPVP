import { createAdminClient } from "@/lib/supabase/admin";

export type ActivityAction =
  | "member_added"
  | "member_updated"
  | "member_removed"
  | "metier_changed"
  | "user_created"
  | "user_reset_password";

interface LogActivityParams {
  actorUsername: string;
  action: ActivityAction;
  message: string;
  targetPseudo?: string;
  factionSlug?: string;
  details?: Record<string, unknown>;
}

export async function logActivity(params: LogActivityParams) {
  try {
    const supabase = createAdminClient();
    await supabase.from("activity_log").insert({
      actor_username: params.actorUsername,
      action: params.action,
      message: params.message,
      target_pseudo: params.targetPseudo ?? null,
      faction_slug: params.factionSlug ?? null,
      details: params.details ?? {},
    });
  } catch (e) {
    console.error("Failed to log activity:", e);
  }
}
