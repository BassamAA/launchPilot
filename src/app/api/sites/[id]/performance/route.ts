import { NextRequest, NextResponse } from "next/server";
import { logRouteError } from "@/lib/observability";
import { getAuthorizedSite, getUser } from "@/lib/supabase";
import { getSitePerformanceData } from "@/lib/performance";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const site = await getAuthorizedSite(params.id);
    if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

    const data = await getSitePerformanceData(params.id);
    return NextResponse.json(data);
  } catch (error) {
    logRouteError("api_site_performance_failed", error, { site_id: params.id });
    return NextResponse.json({ error: "Failed to fetch performance data" }, { status: 500 });
  }
}
