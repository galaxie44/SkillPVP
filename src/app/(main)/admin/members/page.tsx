import dynamic from "next/dynamic";
import { getSessionUser } from "@/lib/auth";
import { hasPermission, getHomeRoute, isFactionAdmin } from "@/lib/permissions";
import { redirect } from "next/navigation";

const AdminMembersClient = dynamic(
  () =>
    import("@/components/admin/AdminMembersClient").then(
      (m) => m.AdminMembersClient
    ),
  {
    loading: () => (
      <p className="py-12 text-center text-muted-foreground">Chargement…</p>
    ),
  }
);

export default async function AdminMembersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  if (
    !user.is_super_admin &&
    !isFactionAdmin(user) &&
    !hasPermission(user.permissions, "members.edit", false) &&
    !hasPermission(user.permissions, "members.view", false)
  ) {
    redirect(getHomeRoute(user));
  }

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Gestion des joueurs</h1>
      <p className="text-muted-foreground">
        Chaque joueur a un compte de connexion et appartient à une faction (v1 ou v2).
        {user.is_super_admin
          ? " En tant qu'admin, tu peux créer des joueurs et les déplacer d'une faction à l'autre."
          : " Tu peux consulter et modifier les joueurs de ta faction."}
      </p>
      <AdminMembersClient
        isSuperAdmin={user.is_super_admin}
        canCreatePlayers={user.is_super_admin}
        defaultFactionId={user.member?.faction_id ?? null}
      />
    </div>
  );
}
