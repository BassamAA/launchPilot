import { NextResponse } from "next/server";
import { getSupabaseServerClient, getUser, getUserFromBearerToken } from "@/lib/supabase";
import { shapeSiteSummary } from "@/lib/mobile/site-summary";
import { ContentItem, Site } from "@/types";

export async function GET(request: Request) {
  const user = await getUserFromBearerToken(request.headers.get("authorization")) || await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServerClient();
  const { data: sites, error } = await supabase
    .from("sites")
    .select("id, name, url, status, brief_json, brief_confirmed, public_tracking_key")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Failed to load sites" }, { status: 500 });

  const rows = await Promise.all(
    ((sites || []) as Pick<Site, "id" | "name" | "url" | "status" | "brief_json" | "brief_confirmed" | "public_tracking_key">[]).map(async (site) => {
      const [{ data: plans }, { data: queueItems }, { count: conversions }] = await Promise.all([
        supabase.from("marketing_plans").select("id").eq("site_id", site.id).limit(1),
        supabase.from("content_items").select("status").eq("site_id", site.id).in("status", ["approved", "draft"]),
        supabase.from("conversions").select("id", { count: "exact", head: true }).eq("site_id", site.id),
      ]);

      return shapeSiteSummary({
        site,
        hasPlan: Boolean(plans && plans.length > 0),
        queueItems: (queueItems || []) as Pick<ContentItem, "status">[],
        trackingActive: (conversions || 0) > 0,
      });
    })
  );

  return NextResponse.json({ sites: rows });
}
