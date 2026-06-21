import {
  Pickaxe,
  Wheat,
  Fish,
  PawPrint,
  Flame,
  Hammer,
  Layers,
  Zap,
  Database,
  Sparkles,
  Factory,
  Skull,
  Cog,
  Droplet,
  Search,
  Recycle,
  type LucideIcon,
} from "lucide-react";
import type { Machine } from "@/types";

export const MACHINE_ICONS: Record<string, LucideIcon> = {
  pickaxe: Pickaxe,
  wheat: Wheat,
  fish: Fish,
  "paw-print": PawPrint,
  flame: Flame,
  hammer: Hammer,
  compress: Layers,
  zap: Zap,
  database: Database,
  sparkles: Sparkles,
  factory: Factory,
  skull: Skull,
  cog: Cog,
  droplet: Droplet,
  search: Search,
  recycle: Recycle,
};

export const MACHINE_CATEGORIES = [
  "Machines",
  "Ressources",
  "Production",
  "Énergie",
  "Stockage",
  "Utilitaire",
  "Général",
] as const;

export function getMachineIcon(icon: string): LucideIcon {
  return MACHINE_ICONS[icon] ?? Cog;
}

export function sortMachines(machines: Machine[]): Machine[] {
  return [...machines].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
}

export function groupMachinesByCategory(machines: Machine[]) {
  const sorted = sortMachines(machines);
  const groups = new Map<string, Machine[]>();
  for (const m of sorted) {
    const list = groups.get(m.category) ?? [];
    list.push(m);
    groups.set(m.category, list);
  }
  return groups;
}
