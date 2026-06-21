import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  getAllMembers,
  getFactions,
  getMetiers,
  getRecentActivities,
} from "@/lib/data";
import {
  canViewFactionPage,
  hasPermission,
  isFactionAdmin,
} from "@/lib/permissions";
import {
  getObjectivesByFaction,
  getPendingSubmissionsByFaction,
  enrichObjectivesWithPending,
  canManageObjective,
} from "@/lib/objectives";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const include = searchParams.get("include") ?? "";
  const wantsMembers = include.includes("members");
  const wantsActivities = include.includes("activities");
  const wantsObjectives = include.includes("objectives");
  const factionSlug = searchParams.get("faction_slug");

  const [factions, metiers] = await Promise.all([
    getFactions(),
    getMetiers(),
  ]);

  const payload: Record<string, unknown> = { factions, metiers };

  if (wantsMembers) {
    const canView =
      user.is_super_admin ||
      hasPermission(user.permissions, "members.view", false) ||
      hasPermission(user.permissions, "faction.stats", false) ||
      hasPermission(user.permissions, "metiers.view", false) ||
      hasPermission(user.permissions, "objectives.view", false);

    if (canView) {
      let members = await getAllMembers();

      if (!user.is_super_admin && !canViewFactionPage(user)) {
        if (user.member?.faction_id) {
          members = members.filter(
            (m) => m.faction_id === user.member!.faction_id
          );
        }
      }

      payload.members = members;
    } else {
      payload.members = [];
    }
  }

  if (wantsActivities) {
    const canView =
      user.is_super_admin ||
      hasPermission(user.permissions, "members.view", false);

    payload.activities = canView ? await getRecentActivities() : [];
  }

  if (wantsObjectives && factionSlug) {
    const faction = factions.find((f) => f.slug === factionSlug);
    if (faction) {
      const canView =
        user.is_super_admin ||
        user.member?.faction_id === faction.id ||
        canViewFactionPage(user);

      if (canView) {
        const rawObjectives = await getObjectivesByFaction(faction.id);
        payload.objectives = await enrichObjectivesWithPending(
          rawObjectives,
          faction.id
        );
        payload.objectives_faction_id = faction.id;
        payload.objectives_pending =
          isFactionAdmin(user) || user.is_super_admin
            ? (await getPendingSubmissionsByFaction(faction.id)).filter(
                (sub) => {
                  const obj = sub.objective as {
                    faction_id: string;
                    is_shared?: boolean;
                  };
                  return obj && canManageObjective(user, obj);
                }
              )
            : [];
      }
    }
  }

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" },
  });
}
