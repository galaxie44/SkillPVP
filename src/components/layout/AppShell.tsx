import { Sidebar } from "@/components/layout/Sidebar";
import { AppProviders } from "@/components/layout/AppProviders";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getFactions } from "@/lib/data";
import { ToastProvider } from "@/contexts/ToastContext";
import { ConfirmProvider } from "@/contexts/ConfirmContext";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const factions = await getFactions();

  return (
    <ToastProvider>
      <ConfirmProvider>
        <div className="flex h-screen overflow-hidden">
          <Sidebar user={user} factions={factions} />
          <main className="flex-1 overflow-y-auto p-8">
            <AppProviders>{children}</AppProviders>
          </main>
        </div>
      </ConfirmProvider>
    </ToastProvider>
  );
}
