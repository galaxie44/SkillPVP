"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/contexts/ToastContext";
import {
  getMachineIcon,
  groupMachinesByCategory,
} from "@/lib/machines";
import { buildMachineRegistry } from "@/lib/machines-data";
import { cn } from "@/lib/utils";
import type { Machine, MemberMachine, SessionUser } from "@/types";

interface MachinesClientProps {
  user: SessionUser;
}

export function MachinesClient({ user }: MachinesClientProps) {
  const { toast } = useToast();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [ownerships, setOwnerships] = useState<MemberMachine[]>([]);
  const [myIds, setMyIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [factionFilter, setFactionFilter] = useState("all");
  const [machineFilter, setMachineFilter] = useState("all");

  const load = useCallback(async () => {
    const res = await fetch("/api/machines");
    if (res.ok) {
      const data = await res.json();
      setMachines(data.machines ?? []);
      setOwnerships(data.ownerships ?? []);
      setMyIds(new Set(data.my_machine_ids ?? []));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleMachine(machineId: string) {
    if (!user.member) return;
    const owned = myIds.has(machineId);
    setToggling(machineId);

    const res = await fetch("/api/machines/ownership", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ machine_id: machineId, owned: !owned }),
    });

    setToggling(null);
    if (res.ok) {
      setMyIds((prev) => {
        const next = new Set(prev);
        if (owned) next.delete(machineId);
        else next.add(machineId);
        return next;
      });
      await load();
      toast({
        message: owned ? "Machine retirée" : "Machine déclarée",
        variant: "success",
      });
    } else {
      const data = await res.json();
      toast({ message: data.error ?? "Erreur", variant: "error" });
    }
  }

  const registry = useMemo(
    () => buildMachineRegistry(ownerships),
    [ownerships]
  );

  const filteredRegistry = useMemo(() => {
    return registry.filter((entry) => {
      const slug = entry.member.faction?.slug;
      if (factionFilter !== "all" && slug !== factionFilter) return false;
      if (machineFilter !== "all") {
        if (!entry.machines.some((m) => m.machine.id === machineFilter)) {
          return false;
        }
      }
      if (search) {
        const q = search.toLowerCase();
        const pseudo = entry.member.minecraft_pseudo.toLowerCase();
        const machineNames = entry.machines
          .map((m) => m.machine.name.toLowerCase())
          .join(" ");
        if (!pseudo.includes(q) && !machineNames.includes(q)) return false;
      }
      return true;
    });
  }, [registry, factionFilter, machineFilter, search]);

  const grouped = groupMachinesByCategory(machines);

  if (loading) {
    return (
      <p className="py-24 text-center text-muted-foreground">Chargement…</p>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Machines</h1>
        <p className="mt-1 text-muted-foreground">
          Déclare tes machines — visible par les factions v1 et v2
        </p>
      </div>

      {user.member && (
        <Card className="glass-card bg-transparent">
          <CardHeader>
            <CardTitle>Mes machines</CardTitle>
            <CardDescription>
              Clique pour déclarer ou retirer une machine que tu possèdes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {Array.from(grouped.entries()).map(([category, items]) => (
              <div key={category}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {category}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {items.map((machine) => {
                    const Icon = getMachineIcon(machine.icon);
                    const owned = myIds.has(machine.id);
                    const busy = toggling === machine.id;

                    return (
                      <button
                        key={machine.id}
                        type="button"
                        disabled={busy}
                        onClick={() => toggleMachine(machine.id)}
                        title={machine.description ?? machine.name}
                        className={cn(
                          "flex flex-col items-center gap-2 rounded-xl border-2 p-3 text-center transition-all",
                          "hover:border-primary/40 hover:bg-accent/50",
                          owned
                            ? "border-primary bg-primary/10 shadow-sm"
                            : "border-border bg-card/50",
                          busy && "pointer-events-none opacity-50"
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-lg",
                            owned ? "bg-primary/20" : "bg-muted"
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-4 w-4",
                              owned ? "text-primary" : "text-muted-foreground"
                            )}
                          />
                        </div>
                        <span
                          className={cn(
                            "text-xs font-semibold leading-tight",
                            owned ? "text-primary" : "text-foreground"
                          )}
                        >
                          {machine.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {!user.member && (
        <Card className="glass-card bg-transparent">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Aucun membre de faction lié — tu peux consulter le registre ci-dessous.
          </CardContent>
        </Card>
      )}

      <Card className="glass-card bg-transparent">
        <CardHeader>
          <CardTitle>Registre des machines</CardTitle>
          <CardDescription>
            Tous les joueurs des factions v1 et v2
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher un pseudo…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={factionFilter} onValueChange={setFactionFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Faction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes factions</SelectItem>
                <SelectItem value="v1">Faction v1</SelectItem>
                <SelectItem value="v2">Faction v2</SelectItem>
              </SelectContent>
            </Select>
            <Select value={machineFilter} onValueChange={setMachineFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Machine" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes machines</SelectItem>
                {machines.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filteredRegistry.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aucune machine déclarée pour l&apos;instant.
            </p>
          ) : (
            <div className="space-y-2">
              {filteredRegistry.map((entry) => (
                <div
                  key={entry.member.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card/50 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{entry.member.minecraft_pseudo}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.member.faction?.name ?? "—"}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {entry.machines.map(({ machine, quantity }) => {
                      const Icon = getMachineIcon(machine.icon);
                      return (
                        <Badge
                          key={machine.id}
                          variant="secondary"
                          className="gap-1"
                        >
                          <Icon className="h-3 w-3" />
                          {machine.name}
                          {quantity > 1 && ` ×${quantity}`}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            {filteredRegistry.length} joueur
            {filteredRegistry.length !== 1 ? "s" : ""} affiché
            {filteredRegistry.length !== 1 ? "s" : ""}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
