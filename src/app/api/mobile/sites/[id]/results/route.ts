import { NextResponse } from "next/server";
import { getSupabaseServerClient, getUser, getUserFromBearerToken } from "@/lib/supabase";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const user = await getUserFromBearerToken(request.headers.get("authorization")) || await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServerClient();
  const [{ data: items }, { count: conversions }] = await Promise.all([
    supabase.from("content_items").select("id, channel, status, published_url, published_date").eq("site_id", params.id),
    supabase.from("conversions").select("id", { count: "exact", head: true }).eq("site_id", params.id),
  ]);

  const rows = items || [];
  const published = rows.filter((item) => item.status === "published");
  const channelBreakdown = Array.from(
    published.reduce<Map<string, number>>((acc, row) => {
      acc.set(row.channel, (acc.get(row.channel) || 0) + 1);
      return acc;
    }, new Map())
  ).map(([channel, count]) => ({ channel, count }));

  return NextResponse.json({
    summary: {
      publishedCount: published.length,
      totalConversions: conversions || 0,
      channelBreakdown,
    },
    recent: published
      .sort((a, b) => String(b.published_date || "").localeCompare(String(a.published_date || "")))
      .slice(0, 20),
  });
}
