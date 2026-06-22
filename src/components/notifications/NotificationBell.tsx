"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UserNotification } from "@/types";

const PANEL_WIDTH = 320;

export function NotificationBell() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [panelStyle, setPanelStyle] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const load = useCallback(async () => {
    const res = await fetch("/api/notifications");
    if (res.ok) {
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnread(data.unread ?? 0);
      setLoaded(true);
    }
  }, []);

  function updatePanelPosition() {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const margin = 8;
    const isMobile = window.innerWidth < 640;

    if (isMobile) {
      setPanelStyle({ top: rect.bottom + margin, left: margin });
      return;
    }

    let left = rect.right + margin;
    if (left + PANEL_WIDTH > window.innerWidth - margin) {
      left = rect.left - PANEL_WIDTH - margin;
    }
    left = Math.max(margin, left);
    setPanelStyle({ top: rect.top, left });
  }

  async function handleOpen() {
    const next = !open;
    if (next) updatePanelPosition();
    setOpen(next);
    if (next) await load();
  }

  useEffect(() => {
    if (!open) return;
    updatePanelPosition();
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);
    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [open]);

  async function markRead(id: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  }

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mark_all_read: true }),
    });
    await load();
  }

  const dropdown =
    open && mounted
      ? createPortal(
          <>
            <div
              className="fixed inset-0 z-[200]"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <div
              className="fixed z-[210] w-[calc(100vw-2rem)] max-w-80 rounded-xl border border-border bg-card shadow-xl sm:w-80"
              style={{ top: panelStyle.top, left: panelStyle.left }}
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <span className="font-semibold">Notifications</span>
                {unread > 0 && (
                  <Button variant="ghost" size="sm" onClick={markAllRead}>
                    <Check className="mr-1 h-3 w-3" />
                    Tout lire
                  </Button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {!loaded ? (
                  <p className="p-4 text-center text-sm text-muted-foreground">
                    Chargement…
                  </p>
                ) : notifications.length === 0 ? (
                  <p className="p-4 text-center text-sm text-muted-foreground">
                    Aucune notification
                  </p>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => !n.read && markRead(n.id)}
                      className={cn(
                        "w-full border-b border-border px-4 py-3 text-left text-sm transition-colors hover:bg-accent/50",
                        !n.read && "bg-primary/5"
                      )}
                    >
                      <p className="font-medium">{n.title}</p>
                      <p className="text-muted-foreground">{n.message}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(n.created_at).toLocaleString("fr-FR")}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          </>,
          document.body
        )
      : null;

  return (
    <>
      <Button
        ref={buttonRef}
        variant="ghost"
        size="icon"
        className="relative shrink-0"
        onClick={handleOpen}
        title="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>
      {dropdown}
    </>
  );
}
