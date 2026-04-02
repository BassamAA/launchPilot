import { NextResponse } from "next/server";
import { getSupabaseServerClient, getUser, getUserFromBearerToken } from "@/lib/supabase";
import { shapeQueueItem } from "@/lib/mobile/queue-shape";
import { ContentItem } from "@/types";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const user = await getUserFromBearerToken(request.headers.get("authorization")) || await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("content_items")
    .select("id, channel, title, body, status, scheduled_date, published_url, metadata_json")
    .eq("site_id", params.id)
    .not("status", "eq", "published")
    .order("scheduled_date", { ascending: true });

  if (error) return NextResponse.json({ error: "Failed to load queue" }, { status: 500 });

  return NextResponse.json({
    items: ((data || []) as ContentItem[]).map(shapeQueueItem),
  });
}
