import { AdminRolesClient } from "@/components/admin/AdminRolesClient";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function AdminRolesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  if (
    !user.is_super_admin &&
    !hasPermission(user.permissions, "roles.view", false)
  ) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold sm:text-3xl">Gestion des rôles</h1>
      <p className="text-muted-foreground">
        Rôles système (Recrue, Membre, AdminFaction) et rôles custom avec permissions
      </p>
      <AdminRolesClient />
    </div>
  );
}
