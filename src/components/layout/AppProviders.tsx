"use client";

import type { Faction, Metier } from "@/types";
import { AppDataProvider } from "@/contexts/AppDataContext";

interface AppProvidersProps {
  children: React.ReactNode;
  initialFactions?: Faction[];
  initialMetiers?: Metier[];
}

export function AppProviders({
  children,
  initialFactions,
  initialMetiers,
}: AppProvidersProps) {
  return (
    <AppDataProvider
      initialFactions={initialFactions}
      initialMetiers={initialMetiers}
    >
      {children}
    </AppDataProvider>
  );
}
