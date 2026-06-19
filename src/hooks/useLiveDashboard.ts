"use client";

import { useCallback, useRef, useState } from "react";
import type {
  ActivityLog,
  Faction,
  FactionMemberWithRelations,
  FactionStats,
  Metier,
} from "@/types";
import { computeAllFactionStats } from "@/lib/stats";

interface UseLiveDashboardOptions {
  members: FactionMemberWithRelations[];
  factions: Faction[];
  metiers: Metier[];
  activities: ActivityLog[];
  factionFilter?: string | null;
  isLive: boolean;
}

export function useLiveDashboard({
  members,
  factions,
  metiers,
  activities,
  factionFilter,
  isLive,
}: UseLiveDashboardOptions) {
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  const highlightTimeout = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  const flashMember = useCallback((id: string) => {
    setHighlightedIds((prev) => new Set(prev).add(id));
    const existing = highlightTimeout.current.get(id);
    if (existing) clearTimeout(existing);
    highlightTimeout.current.set(
      id,
      setTimeout(() => {
        setHighlightedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        highlightTimeout.current.delete(id);
      }, 2500)
    );
    setLastUpdate(new Date());
  }, []);

  const visibleMembers = factionFilter
    ? members.filter((m) => m.faction_id === factionFilter)
    : members;

  const relevantFactions = factionFilter
    ? factions.filter((f) => f.id === factionFilter)
    : factions;

  const factionStats: FactionStats[] = computeAllFactionStats(
    relevantFactions,
    visibleMembers
  );

  return {
    members: visibleMembers,
    allMembers: members,
    factions,
    metiers,
    factionStats,
    activities,
    isLive,
    lastUpdate,
    highlightedIds,
    flashMember,
  };
}
