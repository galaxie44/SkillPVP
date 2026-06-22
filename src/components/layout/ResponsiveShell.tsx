"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { Faction, SessionUser } from "@/types";

interface ResponsiveShellProps {
  user: SessionUser;
  factions: Faction[];
  children: React.ReactNode;
}

export function ResponsiveShell({
  user,
  factions,
  children,
}: ResponsiveShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      <Sidebar
        user={user}
        factions={factions}
        className="hidden lg:flex"
      />

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Fermer le menu"
          />
          <div className="relative z-10 flex h-full w-[min(100%,16rem)] shadow-2xl">
            <Sidebar
              user={user}
              factions={factions}
              className="h-full w-full"
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-card/40 px-4 py-3 backdrop-blur-xl lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="truncate text-lg font-bold">
            <span className="gradient-text">SkillPVP</span>
          </h1>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <UserAvatar username={user.username} size="sm" />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
