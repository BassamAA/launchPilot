import { NextRequest, NextResponse } from "next/server";
import { getUser, getSupabaseAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("content_items")
    .select("id, channel, title, body, status, scheduled_date, site_id")
    .eq("id", id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(data);
}
