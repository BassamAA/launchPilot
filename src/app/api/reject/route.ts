import { NextRequest, NextResponse } from "next/server";
import { getAuthorizedContentItem, getUser, getSupabaseAdminClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { content_item_id, reason } = await req.json();
    if (!content_item_id) {
      return NextResponse.json({ error: "content_item_id required" }, { status: 400 });
    }

    const authorizedItem = await getAuthorizedContentItem(content_item_id);
    if (!authorizedItem) {
      return NextResponse.json({ error: "Content item not found" }, { status: 404 });
    }

    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
      .from("content_items")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("id", content_item_id)
      .select("site_id, title, channel")
      .single();

    if (error) throw error;

    if (data) {
      await supabase.from("activity_log").insert({
        site_id: data.site_id,
        action: "content_rejected",
        description: `Rejected: ${data.title} (${data.channel})${reason ? ` — ${reason}` : ""}`,
        metadata_json: { content_item_id, reason: reason || null },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[/api/reject]", error);
    return NextResponse.json({ error: "Reject failed" }, { status: 500 });
  }
}
