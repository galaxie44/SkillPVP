"use client";

import { useEffect, useState } from "react";
import { getTacheCooldownRemaining } from "@/lib/metiers";

/** Cooldown depuis la BD — un seul timer, pas de polling */
export function useTacheCooldown(allowedAt: string | null | undefined) {
  const [remaining, setRemaining] = useState(() =>
    getTacheCooldownRemaining(allowedAt)
  );

  useEffect(() => {
    const ms = getTacheCooldownRemaining(allowedAt);
    setRemaining(ms);
    if (ms <= 0) return;
    const timer = setTimeout(() => setRemaining(0), ms);
    return () => clearTimeout(timer);
  }, [allowedAt]);

  return remaining;
}
