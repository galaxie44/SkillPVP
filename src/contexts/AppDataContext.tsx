"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { usePathname } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/browser";
import { debounce } from "@/lib/debounce";
import type {
  ActivityLog,
  Faction,
  FactionMemberWithRelations,
  FactionObjective,
  Metier,
  ObjectiveSubmission,
} from "@/types";

const META_TTL_MS = 10 * 60 * 1000;
const MEMBERS_TTL_MS = 5 * 60 * 1000;
const OBJECTIVES_TTL_MS = 2 * 60 * 1000;
const REALTIME_DEBOUNCE_MS = 4000;

function routeNeedsMembers(path: string) {
  return (
    path.startsWith("/dashboard") ||
    path.startsWith("/factions") ||
    path.startsWith("/admin")
  );
}

function routeNeedsActivities(path: string) {
  return path.startsWith("/dashboard");
}

function routeNeedsRealtime(path: string) {
  return routeNeedsMembers(path);
}

function getFactionSlug(path: string): string | null {
  if (!path.startsWith("/factions/")) return null;
  return path.split("/")[2] ?? null;
}

interface AppDataContextValue {
  factions: Faction[];
  metiers: Metier[];
  members: FactionMemberWithRelations[] | null;
  activities: ActivityLog[] | null;
  objectives: FactionObjective[] | null;
  objectivesPending: ObjectiveSubmission[];
  objectivesFactionId: string | null;
  metaLoading: boolean;
  membersLoading: boolean;
  objectivesLoading: boolean;
  isLive: boolean;
  refreshMeta: (force?: boolean) => Promise<void>;
  refreshMembers: (force?: boolean) => Promise<void>;
  refreshActivities: (force?: boolean) => Promise<void>;
  refreshObjectives: (factionId: string, force?: boolean) => Promise<void>;
  setMembers: Dispatch<SetStateAction<FactionMemberWithRelations[] | null>>;
  setActivities: Dispatch<SetStateAction<ActivityLog[] | null>>;
  setObjectives: Dispatch<SetStateAction<FactionObjective[] | null>>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

interface AppDataProviderProps {
  children: React.ReactNode;
  initialFactions?: Faction[];
  initialMetiers?: Metier[];
}

export function AppDataProvider({
  children,
  initialFactions = [],
  initialMetiers = [],
}: AppDataProviderProps) {
  const pathname = usePathname();
  const hasInitialMeta = initialFactions.length > 0;
  const [factions, setFactions] = useState<Faction[]>(initialFactions);
  const [metiers, setMetiers] = useState<Metier[]>(initialMetiers);
  const [members, setMembers] = useState<FactionMemberWithRelations[] | null>(
    null
  );
  const [activities, setActivities] = useState<ActivityLog[] | null>(null);
  const [objectives, setObjectives] = useState<FactionObjective[] | null>(null);
  const [objectivesPending, setObjectivesPending] = useState<
    ObjectiveSubmission[]
  >([]);
  const [objectivesFactionId, setObjectivesFactionId] = useState<string | null>(
    null
  );
  const [metaLoading, setMetaLoading] = useState(!hasInitialMeta);
  const [membersLoading, setMembersLoading] = useState(false);
  const [objectivesLoading, setObjectivesLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const metaFetchedAt = useRef(hasInitialMeta ? Date.now() : 0);
  const membersFetchedAt = useRef(0);
  const activitiesFetchedAt = useRef(0);
  const objectivesFetchedAt = useRef(0);
  const objectivesSlugRef = useRef<string | null>(null);

  const applyBootstrap = useCallback((data: Record<string, unknown>) => {
    if (data.factions) {
      setFactions(data.factions as Faction[]);
      metaFetchedAt.current = Date.now();
    }
    if (data.metiers) setMetiers(data.metiers as Metier[]);
    if (data.members) {
      setMembers(data.members as FactionMemberWithRelations[]);
      membersFetchedAt.current = Date.now();
    }
    if (data.activities) {
      setActivities(data.activities as ActivityLog[]);
      activitiesFetchedAt.current = Date.now();
    }
    if (data.objectives) {
      setObjectives(data.objectives as FactionObjective[]);
      setObjectivesPending(
        (data.objectives_pending as ObjectiveSubmission[]) ?? []
      );
      setObjectivesFactionId(
        (data.objectives_faction_id as string | null) ?? null
      );
      objectivesFetchedAt.current = Date.now();
    }
  }, []);

  const refreshMeta = useCallback(async (force = false) => {
    if (
      !force &&
      metaFetchedAt.current &&
      Date.now() - metaFetchedAt.current < META_TTL_MS &&
      factions.length > 0
    ) {
      return;
    }
    const res = await fetch("/api/meta");
    if (res.ok) {
      const meta = await res.json();
      setFactions(meta.factions ?? []);
      setMetiers(meta.metiers ?? []);
      metaFetchedAt.current = Date.now();
    }
  }, [factions.length]);

  const refreshMembers = useCallback(async (force = false) => {
    if (
      !force &&
      membersFetchedAt.current &&
      Date.now() - membersFetchedAt.current < MEMBERS_TTL_MS &&
      members !== null
    ) {
      return;
    }
    const res = await fetch("/api/bootstrap?include=members");
    if (res.ok) applyBootstrap(await res.json());
  }, [members, applyBootstrap]);

  const refreshActivities = useCallback(async (force = false) => {
    if (
      !force &&
      activitiesFetchedAt.current &&
      Date.now() - activitiesFetchedAt.current < MEMBERS_TTL_MS &&
      activities !== null
    ) {
      return;
    }
    const res = await fetch("/api/bootstrap?include=activities");
    if (res.ok) applyBootstrap(await res.json());
  }, [activities, applyBootstrap]);

  const refreshObjectives = useCallback(
    async (factionId: string, force = false) => {
      if (
        !force &&
        objectivesFetchedAt.current &&
        objectivesFactionId === factionId &&
        Date.now() - objectivesFetchedAt.current < OBJECTIVES_TTL_MS &&
        objectives !== null
      ) {
        return;
      }
      setObjectivesLoading(true);
      const res = await fetch(`/api/objectives?faction_id=${factionId}`);
      if (res.ok) {
        const data = await res.json();
        setObjectives(data.objectives ?? []);
        setObjectivesPending(data.pending ?? []);
        setObjectivesFactionId(factionId);
        objectivesFetchedAt.current = Date.now();
      }
      setObjectivesLoading(false);
    },
    [objectives, objectivesFactionId]
  );

  // Un seul chargement par navigation (évite meta + bootstrap en double)
  useEffect(() => {
    let cancelled = false;

    async function loadRouteData() {
      const factionSlug = getFactionSlug(pathname);
      const needsMembers = routeNeedsMembers(pathname);
      const needsActivities = routeNeedsActivities(pathname);

      const metaStale =
        !metaFetchedAt.current ||
        Date.now() - metaFetchedAt.current >= META_TTL_MS;
      const membersStale =
        !membersFetchedAt.current ||
        Date.now() - membersFetchedAt.current >= MEMBERS_TTL_MS;
      const activitiesStale =
        !activitiesFetchedAt.current ||
        Date.now() - activitiesFetchedAt.current >= MEMBERS_TTL_MS;
      const objectivesStale =
        !objectivesFetchedAt.current ||
        Date.now() - objectivesFetchedAt.current >= OBJECTIVES_TTL_MS ||
        objectivesSlugRef.current !== factionSlug;

      const include: string[] = [];
      if (needsMembers && membersStale) include.push("members");
      if (needsActivities && activitiesStale) include.push("activities");
      if (factionSlug && objectivesStale) include.push("objectives");

      if (include.length === 0) {
        if (metaStale) {
          setMetaLoading(true);
          const res = await fetch("/api/meta");
          if (!cancelled && res.ok) {
            const meta = await res.json();
            setFactions(meta.factions ?? []);
            setMetiers(meta.metiers ?? []);
            metaFetchedAt.current = Date.now();
          }
          if (!cancelled) setMetaLoading(false);
        } else {
          setMetaLoading(false);
        }
        return;
      }

      if (needsMembers && membersStale) setMembersLoading(true);
      if (factionSlug && objectivesStale) setObjectivesLoading(true);
      if (metaStale) setMetaLoading(true);

      const params = new URLSearchParams({ include: include.join(",") });
      if (factionSlug) {
        params.set("faction_slug", factionSlug);
      }

      const res = await fetch(`/api/bootstrap?${params}`);
      if (!cancelled && res.ok) {
        applyBootstrap(await res.json());
        if (factionSlug) {
          objectivesSlugRef.current = factionSlug;
        }
      }

      if (!cancelled) {
        setMetaLoading(false);
        setMembersLoading(false);
        setObjectivesLoading(false);
      }
    }

    loadRouteData();
    return () => {
      cancelled = true;
    };
  }, [pathname, applyBootstrap]);

  const debouncedMembersRefresh = useMemo(
    () => debounce(() => refreshMembers(true), REALTIME_DEBOUNCE_MS),
    [refreshMembers]
  );

  useEffect(() => {
    if (!routeNeedsRealtime(pathname)) return;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;

    const supabase = getBrowserClient();
    const channel = supabase
      .channel("app-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "faction_members" },
        () => debouncedMembersRefresh()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_log" },
        (payload) => {
          const row = payload.new as ActivityLog;
          setActivities((prev) => [row, ...(prev ?? [])].slice(0, 50));
        }
      )
      .subscribe((status) => setIsLive(status === "SUBSCRIBED"));

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pathname, debouncedMembersRefresh]);

  const value = useMemo(
    () => ({
      factions,
      metiers,
      members,
      activities,
      objectives,
      objectivesPending,
      objectivesFactionId,
      metaLoading,
      membersLoading,
      objectivesLoading,
      isLive,
      refreshMeta,
      refreshMembers,
      refreshActivities,
      refreshObjectives,
      setMembers,
      setActivities,
      setObjectives,
    }),
    [
      factions,
      metiers,
      members,
      activities,
      objectives,
      objectivesPending,
      objectivesFactionId,
      metaLoading,
      membersLoading,
      objectivesLoading,
      isLive,
      refreshMeta,
      refreshMembers,
      refreshActivities,
      refreshObjectives,
    ]
  );

  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) {
    throw new Error("useAppData must be used within AppDataProvider");
  }
  return ctx;
}
