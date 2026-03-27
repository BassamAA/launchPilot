import { NextRequest, NextResponse } from "next/server";
import { getFunnelIntelligence } from "@/lib/funnel";
import { logRouteError } from "@/lib/observability";
import { getAuthorizedSite, getUser, getSupabaseAdminClient } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const site = await getAuthorizedSite(params.id);
    if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

    const supabase = getSupabaseAdminClient();
    const payload = await getFunnelIntelligence(params.id, supabase);
    return NextResponse.json(payload);
  } catch (error) {
    logRouteError("api_site_funnel_get_failed", error, { site_id: params.id });
    return NextResponse.json({ error: "Failed to load funnel intelligence" }, { status: 500 });
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const site = await getAuthorizedSite(params.id);
    if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

    const supabase = getSupabaseAdminClient();
    await supabase.from("funnel_recommendations").delete().eq("site_id", params.id);
    await supabase.from("offer_tests").delete().eq("site_id", params.id);

    const payload = await getFunnelIntelligence(params.id, supabase);
    return NextResponse.json(payload);
  } catch (error) {
    logRouteError("api_site_funnel_post_failed", error, { site_id: params.id });
    return NextResponse.json({ error: "Failed to refresh funnel intelligence" }, { status: 500 });
  }
}
