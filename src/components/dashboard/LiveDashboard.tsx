"use client";

import { useMemo } from "react";
import { FactionCard } from "@/components/dashboard/FactionCard";
import { MetierTable } from "@/components/dashboard/MetierTable";
import { LiveActivityFeed } from "@/components/dashboard/LiveActivityFeed";
import { OnlineUsers } from "@/components/dashboard/OnlineUsers";
import { LiveIndicator } from "@/components/dashboard/LiveIndicator";
import { useLiveDashboard } from "@/hooks/useLiveDashboard";
import { usePresence } from "@/hooks/usePresence";
import { useAppData } from "@/contexts/AppDataContext";
import type { SessionUser, ActivityLog } from "@/types";

const EMPTY_ACTIVITIES: ActivityLog[] = [];

interface LiveDashboardProps {
  user: SessionUser;
}

export function LiveDashboard({ user }: LiveDashboardProps) {
  const { factions, metiers, members, activities, membersLoading, isLive } =
    useAppData();

  const factionFilter = user.is_super_admin
    ? null
    : user.member?.faction_id ?? null;

  const visibleMembers = useMemo(() => {
    if (!members) return [];
    if (user.is_super_admin) return members;
    return members.filter((m) => m.faction_id === user.member?.faction_id);
  }, [members, user]);

  const {
    members: liveMembers,
    factions: liveFactions,
    metiers: liveMetiers,
    factionStats,
    activities: liveActivities,
    isLive: liveConnected,
    lastUpdate,
    highlightedIds,
  } = useLiveDashboard({
    members: visibleMembers,
    factions,
    metiers,
    activities: activities ?? EMPTY_ACTIVITIES,
    factionFilter,
    isLive,
  });

  const onlineUsers = usePresence({
    userId: user.id,
    username: user.username,
    page: "dashboard",
  });

  if (membersLoading && !members) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        Chargement du dashboard…
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-up">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="gradient-text">Dashboard</span>
          </h1>
          <p className="mt-1 text-muted-foreground">
            Vue globale en temps réel — sans rafraîchir la page
          </p>
        </div>
        <LiveIndicator isLive={liveConnected} lastUpdate={lastUpdate} />
      </div>

      <OnlineUsers users={onlineUsers} currentUserId={user.id} />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <div className="grid gap-6 md:grid-cols-2">
            {factionStats.map((stats) => (
              <FactionCard key={stats.faction.id} stats={stats} />
            ))}
          </div>
          <MetierTable
            members={liveMembers}
            factions={liveFactions}
            metiers={liveMetiers}
            highlightedIds={highlightedIds}
          />
        </div>
        <LiveActivityFeed activities={liveActivities} />
      </div>
    </div>
  );
}
