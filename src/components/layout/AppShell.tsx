import { ResponsiveShell } from "@/components/layout/ResponsiveShell";
import { AppProviders } from "@/components/layout/AppProviders";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getFactions, getMetiers } from "@/lib/data";
import { ToastProvider } from "@/contexts/ToastContext";
import { ConfirmProvider } from "@/contexts/ConfirmContext";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [factions, metiers] = await Promise.all([
    getFactions(),
    getMetiers(),
  ]);

  return (
    <ToastProvider>
      <ConfirmProvider>
        <ResponsiveShell user={user} factions={factions}>
          <AppProviders initialFactions={factions} initialMetiers={metiers}>
            {children}
          </AppProviders>
        </ResponsiveShell>
      </ConfirmProvider>
    </ToastProvider>
  );
}
