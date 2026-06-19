"use client";

import { useAppData } from "@/contexts/AppDataContext";
import type { FactionMemberWithRelations } from "@/types";

const EMPTY_MEMBERS: FactionMemberWithRelations[] = [];

/** Membres depuis le cache global + indicateur live (plus de canal dupliqué). */
export function useLiveMembers() {
  const { members, isLive, refreshMembers } = useAppData();
  return {
    members: members ?? EMPTY_MEMBERS,
    refresh: () => refreshMembers(true),
    isLive,
  };
}
