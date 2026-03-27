import { NextRequest, NextResponse } from "next/server";
import { getAuthorizedSite, getUser, getSupabaseAdminClient } from "@/lib/supabase";
import { DashboardStats, ContentChannel } from "@/types";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const site = await getAuthorizedSite(params.id);
    if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

    const supabase = getSupabaseAdminClient();
    const siteId = site.id;

    const { data: items } = await supabase
      .from("content_items")
      .select("status, channel, metadata_json")
      .eq("site_id", siteId);

    if (!items) return NextResponse.json({ error: "Site not found" }, { status: 404 });

    const total_generated = items.filter((i) => i.status !== "draft" || i).length;
    const total_approved = items.filter((i) => ["approved", "published"].includes(i.status)).length;
    const total_published = items.filter((i) => i.status === "published").length;
    const pending_approval = items.filter((i) => i.status === "draft").length;

    // Estimated reach by channel (rough averages for indie products)
    const reachByChannel: Record<ContentChannel, number> = {
      blog: 500,
      twitter: 200,
      linkedin: 150,
      reddit: 1000,
      email: 50,
      tiktok: 2000,
      directory: 300,
    };

    const estimated_reach = items
      .filter((i) => i.status === "published")
      .reduce((sum, i) => sum + (reachByChannel[i.channel as ContentChannel] || 0), 0);

    const content_by_channel = items.reduce<Record<string, number>>((acc, item) => {
      acc[item.channel] = (acc[item.channel] || 0) + 1;
      return acc;
    }, {}) as Record<ContentChannel, number>;

    const stats: DashboardStats = {
      total_generated,
      total_approved,
      total_published,
      estimated_reach,
      pending_approval,
      content_by_channel,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("[/api/sites/[id]/dashboard]", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
