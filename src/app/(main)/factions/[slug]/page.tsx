import { FactionDetailClient } from "@/components/factions/FactionDetailClient";

import { getSessionUser } from "@/lib/auth";

import { redirect } from "next/navigation";



interface PageProps {

  params: Promise<{ slug: string }>;

}



export default async function FactionDetailPage({ params }: PageProps) {

  const { slug } = await params;

  const user = await getSessionUser();

  if (!user) redirect("/login");



  return <FactionDetailClient slug={slug} user={user} />;

}

