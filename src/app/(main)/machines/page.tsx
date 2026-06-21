import dynamic from "next/dynamic";
import { getSessionUser } from "@/lib/auth";
import { canViewFactionPage, getHomeRoute } from "@/lib/permissions";
import { redirect } from "next/navigation";

const MachinesClient = dynamic(
  () =>
    import("@/components/machines/MachinesClient").then((m) => m.MachinesClient),
  {
    loading: () => (
      <p className="py-24 text-center text-muted-foreground">Chargement…</p>
    ),
  }
);

export default async function MachinesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  if (!canViewFactionPage(user)) {
    redirect(getHomeRoute(user));
  }

  return <MachinesClient user={user} />;
}
