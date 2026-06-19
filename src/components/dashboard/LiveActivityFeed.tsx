"use client";

import {
  UserPlus,
  UserMinus,
  Pencil,
  Pickaxe,
  Key,
  RefreshCw,
  Activity,
} from "lucide-react";
import type { ActivityLog } from "@/types";
import { cn } from "@/lib/utils";

const ICONS = {
  member_added: UserPlus,
  member_updated: Pencil,
  member_removed: UserMinus,
  metier_changed: Pickaxe,
  user_created: Key,
  user_reset_password: RefreshCw,
};

const COLORS = {
  member_added: "text-emerald-400 bg-emerald-400/10",
  member_updated: "text-blue-400 bg-blue-400/10",
  member_removed: "text-red-400 bg-red-400/10",
  metier_changed: "text-orange-400 bg-orange-400/10",
  user_created: "text-purple-400 bg-purple-400/10",
  user_reset_password: "text-amber-400 bg-amber-400/10",
};

interface LiveActivityFeedProps {
  activities: ActivityLog[];
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "à l'instant";
  const min = Math.floor(sec / 60);
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  return `il y a ${h}h`;
}

export function LiveActivityFeed({ activities }: LiveActivityFeedProps) {
  return (
    <div className="glass-card flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-white/5 p-4">
        <Activity className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">Activité en direct</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-3" style={{ maxHeight: 420 }}>
        {activities.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aucune activité récente
          </p>
        ) : (
          <ul className="space-y-2">
            {activities.map((a, i) => {
              const Icon =
                ICONS[a.action as keyof typeof ICONS] ?? Activity;
              const color =
                COLORS[a.action as keyof typeof COLORS] ??
                "text-muted-foreground bg-muted";
              return (
                <li
                  key={a.id}
                  className={cn(
                    "flex gap-3 rounded-lg p-3 transition-colors hover:bg-white/5",
                    i === 0 && "activity-enter"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      color
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug">{a.message}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{timeAgo(a.created_at)}</span>
                      {a.faction_slug && (
                        <span className="rounded bg-white/5 px-1.5 py-0.5 uppercase">
                          {a.faction_slug}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
