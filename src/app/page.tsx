import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getHomeRoute } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  redirect(getHomeRoute(user));
}
