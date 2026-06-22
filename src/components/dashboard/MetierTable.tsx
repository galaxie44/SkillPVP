"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { FactionMemberWithRelations, Faction, Metier } from "@/types";
import { cn } from "@/lib/utils";

interface MetierTableProps {
  members: FactionMemberWithRelations[];
  factions: Faction[];
  metiers: Metier[];
  highlightedIds?: Set<string>;
}

export function MetierTable({ members, factions, metiers, highlightedIds }: MetierTableProps) {
  const [search, setSearch] = useState("");
  const [factionFilter, setFactionFilter] = useState("all");
  const [metierFilter, setMetierFilter] = useState("all");

  const filtered = useMemo(() => {
    return members.filter((m) => {
      const matchSearch = m.minecraft_pseudo
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchFaction =
        factionFilter === "all" || m.faction_id === factionFilter;
      const matchMetier =
        metierFilter === "all" ||
        (metierFilter === "none" ? !m.metier_id : m.metier_id === metierFilter);
      return matchSearch && matchFaction && matchMetier;
    });
  }, [members, search, factionFilter, metierFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Input
          placeholder="Rechercher un pseudo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:max-w-xs"
        />
        <Select value={factionFilter} onValueChange={setFactionFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Faction" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes factions</SelectItem>
            {factions.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={metierFilter} onValueChange={setMetierFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Tâche" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les tâches</SelectItem>
            <SelectItem value="none">Aucune tâche</SelectItem>
            {metiers.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Vue cartes — mobile / tablette */}
      <div className="space-y-2 lg:hidden">
        {filtered.length === 0 ? (
          <p className="rounded-xl border border-white/5 px-4 py-8 text-center text-sm text-muted-foreground">
            Aucun membre trouvé
          </p>
        ) : (
          filtered.map((m) => (
            <div
              key={m.id}
              className={cn(
                "rounded-xl border border-white/5 p-4 transition-colors",
                highlightedIds?.has(m.id) && "row-highlight"
              )}
            >
              <p className="font-medium">{m.minecraft_pseudo}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="outline">{m.faction?.name}</Badge>
                <Badge variant="secondary">
                  {m.metier?.name ?? "Aucune tâche"}
                </Badge>
                <Badge variant="outline">{m.role?.name}</Badge>
              </div>
              {m.user?.username && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Compte : {m.user.username}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {/* Vue tableau — desktop */}
      <div className="hidden overflow-x-auto rounded-xl border border-white/5 lg:block">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-white/5">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Pseudo MC</th>
              <th className="px-4 py-3 text-left font-medium">Faction</th>
              <th className="px-4 py-3 text-left font-medium">Tâche</th>
              <th className="px-4 py-3 text-left font-medium">Rôle</th>
              <th className="px-4 py-3 text-left font-medium">Compte</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Aucun membre trouvé
                </td>
              </tr>
            ) : (
              filtered.map((m) => (
                <tr
                  key={m.id}
                  className={cn(
                    "border-t border-white/5 transition-colors hover:bg-white/5",
                    highlightedIds?.has(m.id) && "row-highlight"
                  )}
                >
                  <td className="px-4 py-3 font-medium">{m.minecraft_pseudo}</td>
                  <td className="px-4 py-3">{m.faction?.name}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">
                      {m.metier?.name ?? "Aucune tâche"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{m.role?.name}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {m.user?.username ?? "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} membre{filtered.length !== 1 ? "s" : ""} affiché
        {filtered.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
