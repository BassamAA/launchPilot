import { NextResponse } from "next/server";
import { getSupabaseServerClient, getUser, getUserFromBearerToken } from "@/lib/supabase";
import { computeNextAction } from "@/lib/mobile/site-summary";
import { Site } from "@/types";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const user = await getUserFromBearerToken(request.headers.get("authorization")) || await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServerClient();

  const [{ data: site }, { data: plans }, { data: contentItems }, { count: conversions }] = await Promise.all([
    supabase
      .from("sites")
      .select("id, name, url, brief_json, brief_confirmed, public_tracking_key")
      .eq("id", params.id)
      .single(),
    supabase.from("marketing_plans").select("id").eq("site_id", params.id).limit(1),
    supabase.from("content_items").select("status, body, scheduled_date").eq("site_id", params.id),
    supabase.from("conversions").select("id", { count: "exact", head: true }).eq("site_id", params.id),
  ]);

  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const items = contentItems || [];
  const hasPlan = Boolean(plans && plans.length > 0);
  const generatedCount = items.filter((item) => Boolean(item.body)).length;
  const approvedCount = items.filter((item) => item.status === "approved" || item.status === "published").length;
  const queueCount = items.filter((item) => item.status === "approved" || item.status === "draft").length;
  const trackingActive = (conversions || 0) > 0;
  const today = new Date().toISOString().split("T")[0];

  return NextResponse.json({
    site: {
      id: site.id,
      name: site.name,
      url: site.url,
    },
    status: {
      hasBrief: Boolean(site.brief_json),
      hasPlan,
      queueCount,
      generatedCount,
      approvedCount,
      trackingReady: Boolean(site.public_tracking_key),
      trackingActive,
    },
    nextAction: computeNextAction({
      site: site as Pick<Site, "id" | "brief_json" | "brief_confirmed" | "public_tracking_key">,
      hasPlan,
      queueCount,
      approvedCount,
      trackingActive,
    }),
    today: {
      scheduledCount: items.filter((item) => item.scheduled_date === today).length,
      publishedCount: items.filter((item) => item.status === "published" && item.scheduled_date === today).length,
    },
  });
}
