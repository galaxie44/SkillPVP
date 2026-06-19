import { NextResponse } from "next/server";
import { getFactions, getMetiers } from "@/lib/data";

export async function GET() {
  const [factions, metiers] = await Promise.all([
    getFactions(),
    getMetiers(),
  ]);
  return NextResponse.json(
    { factions, metiers },
    {
      headers: {
        "Cache-Control": "private, max-age=300, stale-while-revalidate=600",
      },
    }
  );
}
