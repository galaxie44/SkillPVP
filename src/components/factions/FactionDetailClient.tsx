"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { MetierTable } from "@/components/dashboard/MetierTable";
import { TacheCardPicker } from "@/components/metiers/TacheCardPicker";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAppData } from "@/contexts/AppDataContext";
import {
  getHomeRoute,
  canViewFactionPage,
  canEditFaction,
  isFactionAdmin,
  canAccessDashboard,
} from "@/lib/permissions";
import {
  formatCooldown,
} from "@/lib/metiers";
import { useTacheCooldown } from "@/hooks/useTacheCooldown";
import { useToast } from "@/contexts/ToastContext";
import { computeFactionStats } from "@/lib/stats";
import type { SessionUser } from "@/types";

const FactionCard = dynamic(
  () =>
    import("@/components/dashboard/FactionCard").then((m) => m.FactionCard),
  { ssr: false, loading: () => null }
);

const ObjectivesPanel = dynamic(
  () =>
    import("@/components/objectives/ObjectivesPanel").then(
      (m) => m.ObjectivesPanel
    ),
  {
    loading: () => (
      <div className="glass-card h-40 animate-pulse rounded-xl" />
    ),
  }
);

interface FactionDetailClientProps {
  slug: string;
  user: SessionUser;
}

export function FactionDetailClient({ slug, user }: FactionDetailClientProps) {
  const router = useRouter();
  const {
    factions,
    metiers,
    members,
    metaLoading,
    membersLoading,
    setMembers,
  } = useAppData();
  const { toast } = useToast();
  const [myTacheId, setMyTacheId] = useState<string | null>(
    user.member?.metier_id ?? null
  );
  const [tacheAllowedAt, setTacheAllowedAt] = useState<string | null>(
    user.member?.tache_change_allowed_at ?? null
  );
  const tacheCooldown = useTacheCooldown(tacheAllowedAt);
  const [tacheLoading, setTacheLoading] = useState(false);
  const [tacheMessage, setTacheMessage] = useState("");
  const [tacheError, setTacheError] = useState("");

  const faction = factions.find((f) => f.slug === slug);
  const isMyFaction = canEditFaction(user, faction?.id ?? "");
  const canManageObjectives =
    user.is_super_admin || (isMyFaction && isFactionAdmin(user));
  const isReadOnly = !!faction && !isMyFaction && canViewFactionPage(user);

  const stats = useMemo(() => {
    if (!faction || !members) return null;
    return computeFactionStats(faction, members);
  }, [faction, members]);

  useEffect(() => {
    setMyTacheId(user.member?.metier_id ?? null);
  }, [user.member?.metier_id]);

  useEffect(() => {
    setTacheAllowedAt(user.member?.tache_change_allowed_at ?? null);
  }, [user.member?.tache_change_allowed_at]);

  useEffect(() => {
    if (metaLoading) return;
    if (!faction) return;

    const allowed =
      user.is_super_admin ||
      canViewFactionPage(user);

    if (!allowed) {
      router.replace(getHomeRoute(user));
    }
  }, [metaLoading, faction, user, router]);

  async function handleTacheSelect(metierId: string | null) {
    if (!user.member || !isMyFaction) return;

    setTacheLoading(true);
    setTacheError("");
    setTacheMessage("");

    const res = await fetch("/api/profile/metier", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metier_id: metierId }),
    });

    const data = await res.json();
    setTacheLoading(false);

    if (!res.ok) {
      const msg = data.error ?? "Erreur";
      setTacheError(msg);
      toast({ message: msg, variant: "error" });
      return;
    }

    setTacheAllowedAt(
      data.member?.tache_change_allowed_at ??
        data.tache_change_allowed_at ??
        null
    );
    toast({
      message: metierId
        ? `Tâche « ${data.member?.metier?.name} » enregistrée`
        : "Tâche retirée",
      variant: "success",
    });

    setMyTacheId(metierId);
    setTacheMessage(
      metierId
        ? `Tu es maintenant sur la tâche « ${data.member?.metier?.name} »`
        : "Tu n'est plus assigné à une tâche"
    );
    if (data.member?.metier_id !== undefined) {
      setMembers((prev) =>
        prev?.map((m) =>
          m.id === user.member!.id
            ? {
                ...m,
                metier_id: metierId,
                metier: data.member?.metier ?? null,
                tache_change_allowed_at:
                  data.member?.tache_change_allowed_at ??
                  data.tache_change_allowed_at,
              }
            : m
        ) ?? null
      );
    }
  }

  if (metaLoading && !faction) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        Chargement…
      </div>
    );
  }

  if (!faction) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Faction introuvable.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-2xl font-bold sm:text-3xl">{faction.name}</h1>
        {isReadOnly && (
          <Badge variant="outline" className="border-amber-500/50 text-amber-600">
            Lecture seule
          </Badge>
        )}
        {stats && (
          <Badge variant="secondary">{stats.memberCount} membres</Badge>
        )}
        {membersLoading && !stats && (
          <Badge variant="outline">Chargement membres…</Badge>
        )}
      </div>

      {isMyFaction && user.member && metiers.length > 0 && (
        <Card className="glass-card bg-transparent">
          <CardHeader>
            <CardTitle>Ma tâche</CardTitle>
            <CardDescription>
              Choisis sur quoi tu travailles pour ta faction
              {tacheCooldown > 0 && (
                <span className="mt-1 block text-amber-600">
                  Prochain changement possible dans {formatCooldown(tacheCooldown)}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <TacheCardPicker
              metiers={metiers}
              selectedId={myTacheId}
              onSelect={handleTacheSelect}
              disabled={tacheLoading || tacheCooldown > 0}
              description="Clique sur une carte pour rejoindre une tâche"
            />
            {tacheMessage && (
              <p className="text-sm text-primary">{tacheMessage}</p>
            )}
            {tacheError && (
              <p className="text-sm text-destructive">{tacheError}</p>
            )}
          </CardContent>
        </Card>
      )}

      {stats && <FactionCard stats={stats} showDetailLink={false} />}

      <ObjectivesPanel
        factionId={faction.id}
        user={user}
        metiers={metiers}
        canManage={canManageObjectives}
        isInFaction={!!isMyFaction}
      />

      {(canAccessDashboard(user) || isMyFaction || isReadOnly) && stats && (
        <div>
          <h2 className="mb-4 text-xl font-semibold">Tous les membres</h2>
          <MetierTable
            members={stats.members}
            factions={factions}
            metiers={metiers}
          />
        </div>
      )}
    </div>
  );
}
