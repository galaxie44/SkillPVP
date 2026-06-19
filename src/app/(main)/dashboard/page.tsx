import { LiveDashboard } from "@/components/dashboard/LiveDashboard";
import { getSessionUser } from "@/lib/auth";
import { canAccessDashboard, getHomeRoute } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  if (!canAccessDashboard(user)) {
    redirect(getHomeRoute(user));
  }

  return <LiveDashboard user={user} />;
}
