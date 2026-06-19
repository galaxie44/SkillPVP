"use client";

import { Radio } from "lucide-react";
import { cn } from "@/lib/utils";

interface LiveIndicatorProps {
  isLive: boolean;
  lastUpdate?: Date | null;
  className?: string;
}

export function LiveIndicator({
  isLive,
  lastUpdate,
  className,
}: LiveIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-2 text-sm", className)}>
      <span className="relative flex h-2.5 w-2.5">
        {isLive && (
          <>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </>
        )}
        {!isLive && (
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-muted-foreground/50" />
        )}
      </span>
      <span className={cn("font-medium", isLive ? "text-emerald-400" : "text-muted-foreground")}>
        {isLive ? "En direct" : "Hors ligne"}
      </span>
      {lastUpdate && isLive && (
        <span className="text-xs text-muted-foreground">
          · maj {lastUpdate.toLocaleTimeString("fr-FR")}
        </span>
      )}
      <Radio className="ml-1 h-3.5 w-3.5 text-muted-foreground/50" />
    </div>
  );
}
