import { NextRequest, NextResponse } from "next/server";
import { logRouteError } from "@/lib/observability";
import { getPartnerIntelligence } from "@/lib/partners";
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
    const { targets, generated } = await getPartnerIntelligence(params.id, supabase);

    const targetIds = targets.map((target) => target.id).filter(Boolean);
    const [{ data: campaigns }, { data: briefs }] = await Promise.all([
      targetIds.length > 0
        ? supabase.from("partner_campaigns").select("*").in("partner_target_id", targetIds)
        : Promise.resolve({ data: [] }),
      targetIds.length > 0
        ? supabase.from("partner_briefs").select("*").in("partner_target_id", targetIds)
        : Promise.resolve({ data: [] }),
    ]);

    return NextResponse.json({
      targets,
      campaigns: campaigns || [],
      briefs: briefs || [],
      generated,
    });
  } catch (error) {
    logRouteError("api_site_partners_get_failed", error, { site_id: params.id });
    return NextResponse.json({ error: "Failed to load partner intelligence" }, { status: 500 });
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
    await supabase.from("partner_briefs").delete().eq("site_id", params.id);
    await supabase.from("partner_campaigns").delete().eq("site_id", params.id);
    await supabase.from("partner_targets").delete().eq("site_id", params.id);

    const payload = await getPartnerIntelligence(params.id, supabase);
    return NextResponse.json(payload);
  } catch (error) {
    logRouteError("api_site_partners_post_failed", error, { site_id: params.id });
    return NextResponse.json({ error: "Failed to refresh partner intelligence" }, { status: 500 });
  }
}
