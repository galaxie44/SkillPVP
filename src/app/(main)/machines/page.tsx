import { MachinesClient } from "@/components/machines/MachinesClient";
import { getSessionUser } from "@/lib/auth";
import { canViewFactionPage, getHomeRoute } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function MachinesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  if (!canViewFactionPage(user)) {
    redirect(getHomeRoute(user));
  }

  return <MachinesClient user={user} />;
}
