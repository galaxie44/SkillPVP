"use client";

import { cn } from "@/lib/utils";
import {
  getMetierIcon,
  METIER_COLORS,
  sortMetiers,
} from "@/lib/metiers";
import type { Metier } from "@/types";

interface TacheCardPickerProps {
  metiers: Metier[];
  selectedId: string | null;
  onSelect: (metierId: string | null) => void;
  allowNone?: boolean;
  disabled?: boolean;
  description?: string;
}

export function TacheCardPicker({
  metiers,
  selectedId,
  onSelect,
  allowNone = true,
  disabled = false,
  description = "Clique sur une carte pour rejoindre une tâche",
}: TacheCardPickerProps) {
  const sorted = sortMetiers(metiers);

  return (
    <div className="space-y-3">
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {allowNone && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSelect(null)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
              "hover:border-primary/40 hover:bg-accent/50",
              selectedId === null
                ? "border-primary bg-primary/10 shadow-sm"
                : "border-border bg-card/50",
              disabled && "pointer-events-none opacity-50"
            )}
          >
            <span className="text-2xl text-muted-foreground">—</span>
            <span className="text-xs font-medium text-muted-foreground">
              Aucune
            </span>
          </button>
        )}
        {sorted.map((metier) => {
          const Icon = getMetierIcon(metier.name);
          const color = METIER_COLORS[metier.name] ?? "#6b7280";
          const selected = selectedId === metier.id;

          return (
            <button
              key={metier.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(metier.id)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                "hover:scale-[1.02] hover:shadow-md",
                selected
                  ? "border-primary bg-primary/10 shadow-md ring-2 ring-primary/20"
                  : "border-border bg-card/50 hover:border-primary/30",
                disabled && "pointer-events-none opacity-50"
              )}
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${color}22` }}
              >
                <Icon className="h-5 w-5" style={{ color }} />
              </div>
              <span
                className={cn(
                  "text-center text-xs font-semibold",
                  selected ? "text-primary" : "text-foreground"
                )}
              >
                {metier.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** @deprecated Utiliser TacheCardPicker */
export const MetierCardPicker = TacheCardPicker;
