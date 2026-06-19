import {
  Wheat,
  Pickaxe,
  Crosshair,
  Wrench,
  ChefHat,
  Gem,
  Swords,
  PawPrint,
  Hammer,
  type LucideIcon,
} from "lucide-react";
import type { Metier } from "@/types";

export const METIER_ORDER = [
  "Agriculteur",
  "Mineur",
  "Chasseur",
  "Ingénieur",
  "Cuisinier",
  "Bijoutier",
  "Combatant",
  "Éleveur",
  "Build base",
] as const;

/** Tâches jouables mais pas proposables comme objectif « niveau métier » */
export const TASK_ONLY_METIER_NAMES = ["Build base"] as const;

/** Cooldown entre deux changements de tâche (3 min) */
export const TACHE_CHANGE_COOLDOWN_MS = 3 * 60 * 1000;

export const METIER_ICONS: Record<string, LucideIcon> = {
  Agriculteur: Wheat,
  Mineur: Pickaxe,
  Chasseur: Crosshair,
  Ingénieur: Wrench,
  Cuisinier: ChefHat,
  Bijoutier: Gem,
  Combatant: Swords,
  Éleveur: PawPrint,
  "Build base": Hammer,
};

export const METIER_COLORS: Record<string, string> = {
  Agriculteur: "#22c55e",
  Mineur: "#f97316",
  Chasseur: "#84cc16",
  Ingénieur: "#3b82f6",
  Cuisinier: "#ef4444",
  Bijoutier: "#a855f7",
  Combatant: "#dc2626",
  Éleveur: "#eab308",
  "Build base": "#0ea5e9",
};

export function sortMetiers(metiers: Metier[]): Metier[] {
  return [...metiers].sort((a, b) => {
    const ia = METIER_ORDER.indexOf(a.name as (typeof METIER_ORDER)[number]);
    const ib = METIER_ORDER.indexOf(b.name as (typeof METIER_ORDER)[number]);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

/** Métiers éligibles aux objectifs de niveau (exclut Build base) */
export function getObjectiveMetiers(metiers: Metier[]): Metier[] {
  return sortMetiers(
    metiers.filter(
      (m) => !TASK_ONLY_METIER_NAMES.includes(m.name as (typeof TASK_ONLY_METIER_NAMES)[number])
    )
  );
}

export function getTacheCooldownRemaining(
  allowedAt: string | null | undefined
): number {
  if (!allowedAt) return 0;
  const until = new Date(allowedAt).getTime();
  return Math.max(0, until - Date.now());
}

export function nextTacheChangeAllowedAt(): string {
  return new Date(Date.now() + TACHE_CHANGE_COOLDOWN_MS).toISOString();
}

export function formatCooldown(ms: number): string {
  if (ms <= 0) return "";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.ceil((ms % 3_600_000) / 60_000);
  if (h > 0) return `${h}h${m > 0 ? ` ${m}min` : ""}`;
  return `${m} min`;
}

export function getMetierIcon(name: string): LucideIcon {
  return METIER_ICONS[name] ?? Wheat;
}
