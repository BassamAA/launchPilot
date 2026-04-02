import { NextResponse } from "next/server";
import { getSupabaseServerClient, getUser, getUserFromBearerToken } from "@/lib/supabase";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const user = await getUserFromBearerToken(request.headers.get("authorization")) || await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("content_items")
    .select("id, channel, title, body, status, scheduled_date, published_url, metadata_json")
    .eq("site_id", params.id)
    .order("scheduled_date", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: "Failed to load library" }, { status: 500 });
  return NextResponse.json({ items: data || [] });
}
