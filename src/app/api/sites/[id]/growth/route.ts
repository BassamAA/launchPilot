import { NextRequest, NextResponse } from "next/server";
import { getAuthorizedSite, getUser } from "@/lib/supabase";
import { getGrowthOverview, reprioritizeGrowthExperiments } from "@/lib/growth";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const site = await getAuthorizedSite(params.id);
    if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

    const overview = await getGrowthOverview(params.id);
    return NextResponse.json(overview);
  } catch (error) {
    console.error("[/api/sites/[id]/growth][GET]", error);
    return NextResponse.json({ error: "Failed to fetch growth overview" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const site = await getAuthorizedSite(params.id);
    if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

    const result = await reprioritizeGrowthExperiments(params.id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[/api/sites/[id]/growth][POST]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to reprioritize growth bets" },
      { status: 500 }
    );
  }
}
