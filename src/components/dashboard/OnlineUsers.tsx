"use client";

import { Users } from "lucide-react";
import type { OnlineUser } from "@/hooks/usePresence";
import { cn } from "@/lib/utils";

interface OnlineUsersProps {
  users: OnlineUser[];
  currentUserId: string;
}

export function OnlineUsers({ users, currentUserId }: OnlineUsersProps) {
  return (
    <div className="glass-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">En ligne</h3>
        <span className="ml-auto rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400">
          {users.length}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {users.length === 0 ? (
          <p className="text-sm text-muted-foreground">Personne en ligne</p>
        ) : (
          users.map((u) => (
            <div
              key={u.user_id}
              className={cn(
                "flex items-center gap-2 rounded-lg border border-white/5 bg-white/5 px-3 py-1.5 text-sm",
                u.user_id === currentUserId && "border-primary/30 bg-primary/10"
              )}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="font-medium">{u.username}</span>
              {u.user_id === currentUserId && (
                <span className="text-xs text-muted-foreground">(toi)</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
