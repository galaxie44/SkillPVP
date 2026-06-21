import dynamic from "next/dynamic";
import { getSessionUser } from "@/lib/auth";
import { canAccessDashboard, getHomeRoute } from "@/lib/permissions";
import { redirect } from "next/navigation";

const LiveDashboard = dynamic(
  () =>
    import("@/components/dashboard/LiveDashboard").then((m) => m.LiveDashboard),
  {
    loading: () => (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        Chargement du dashboard…
      </div>
    ),
  }
);

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  if (!canAccessDashboard(user)) {
    redirect(getHomeRoute(user));
  }

  return <LiveDashboard user={user} />;
}
