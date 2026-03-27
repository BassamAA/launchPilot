import { NextRequest, NextResponse } from "next/server";
import { getAuthorizedSite, getUser, getSupabaseAdminClient } from "@/lib/supabase";

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
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "draft";
    const channel = searchParams.get("channel");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    let query = supabase
      .from("content_items")
      .select("*", { count: "exact" })
      .eq("site_id", site.id)
      .eq("status", status)
      .order("scheduled_date", { ascending: true })
      .range(offset, offset + limit - 1);

    if (channel) query = query.eq("channel", channel);

    const { data: items, count, error } = await query;
    if (error) throw error;

    return NextResponse.json({ items: items || [], total: count || 0, page, limit });
  } catch (error) {
    console.error("[/api/sites/[id]/queue]", error);
    return NextResponse.json({ error: "Failed to fetch queue" }, { status: 500 });
  }
}
