import { Suspense } from "react";
import { ProfileClient } from "@/components/profile/ProfileClient";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold sm:text-3xl">Profil</h1>
      <Suspense>
        <ProfileClient user={user} />
      </Suspense>
    </>
  );
}
