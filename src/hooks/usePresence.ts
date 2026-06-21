"use client";

import { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";

export interface OnlineUser {
  user_id: string;
  username: string;
  page?: string;
  online_at: string;
}

interface UsePresenceOptions {
  userId: string;
  username: string;
  page?: string;
}

export function usePresence({ userId, username, page }: UsePresenceOptions) {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;

    const supabase = getBrowserClient();

    const channel = supabase.channel("skillpvp-online", {
      config: { presence: { key: userId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<OnlineUser>();
        const users: OnlineUser[] = [];
        for (const presences of Object.values(state)) {
          if (presences[0]) users.push(presences[0]);
        }
        users.sort((a, b) => a.username.localeCompare(b.username));
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: userId,
            username,
            page: page ?? "dashboard",
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, username, page]);

  return onlineUsers;
}
