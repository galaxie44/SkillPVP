"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Shield,
  LogOut,
  Swords,
  User,
  Cog,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { canAccessDashboard, canViewFactionPage, isFactionAdmin } from "@/lib/permissions";
import type { Faction, SessionUser } from "@/types";

interface SidebarProps {
  user: SessionUser;
  factions: Faction[];
  className?: string;
  onNavigate?: () => void;
}

export function Sidebar({ user, factions, className, onNavigate }: SidebarProps) {
  const pathname = usePathname();

  const mainLinks = [
    ...(canAccessDashboard(user)
      ? [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }]
      : []),
    ...(canViewFactionPage(user)
      ? [
          { href: "/machines", label: "Machines", icon: Cog },
          ...factions
            .filter((f) => f.slug === "v1" || f.slug === "v2")
            .sort((a, b) => a.slug.localeCompare(b.slug))
            .map((f) => ({
              href: `/factions/${f.slug}`,
              label: f.name,
              icon: Swords,
            })),
        ]
      : []),
    { href: "/profile", label: "Profil", icon: User },
  ];

  const memberAdmin =
    user.is_super_admin ||
    user.permissions.includes("members.edit") ||
    user.permissions.includes("members.view");

  const adminLinks = [
    ...(memberAdmin && isFactionAdmin(user)
      ? [{ href: "/admin/members", label: "Joueurs", icon: Users }]
      : []),
    ...(user.is_super_admin || user.permissions.includes("roles.view")
      ? [{ href: "/admin/roles", label: "Rôles", icon: Shield }]
      : []),
  ];

  const allLinks = [...mainLinks, ...adminLinks];

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <aside
      className={cn(
        "flex h-full w-64 shrink-0 flex-col border-r border-border bg-card/40 backdrop-blur-xl",
        className
      )}
    >
      <div className="border-b border-border p-6">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-xl font-bold">
            <span className="gradient-text">SkillPVP</span>
          </h1>
          {onNavigate && (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 lg:hidden"
              onClick={onNavigate}
              aria-label="Fermer le menu"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <UserAvatar username={user.username} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.username}</p>
            {user.is_super_admin && (
              <span className="mt-0.5 inline-block rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
                Super Admin
              </span>
            )}
            {!user.is_super_admin && user.member?.role?.name === "AdminFaction" && (
              <span className="mt-0.5 inline-block rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
                Admin Faction
              </span>
            )}
          </div>
          <div className="hidden lg:block">
            <NotificationBell />
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {allLinks.map((link) => {
          const Icon = link.icon;
          const active =
            pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-primary/15 text-primary shadow-sm shadow-primary/10"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-border p-4">
        <ThemeToggle />
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 rounded-lg hover:bg-accent"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </Button>
      </div>
    </aside>
  );
}
