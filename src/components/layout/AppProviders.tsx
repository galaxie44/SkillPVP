"use client";

import { AppDataProvider } from "@/contexts/AppDataContext";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <AppDataProvider>{children}</AppDataProvider>;
}
