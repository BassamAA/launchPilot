import { NextRequest, NextResponse } from "next/server";
import { getAuthorizedContentItem, getUser, getSupabaseAdminClient } from "@/lib/supabase";

// Resets a content item back to draft with empty body so it gets regenerated
export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { content_item_id } = await req.json();
    if (!content_item_id) {
      return NextResponse.json({ error: "content_item_id required" }, { status: 400 });
    }

    const authorizedItem = await getAuthorizedContentItem(content_item_id);
    if (!authorizedItem) {
      return NextResponse.json({ error: "Content item not found" }, { status: 404 });
    }

    const supabase = getSupabaseAdminClient();

    // Reset to draft with empty body
    await supabase
      .from("content_items")
      .update({
        status: "draft",
        body: "",
        published_date: null,
        published_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", content_item_id);

    // Trigger generation immediately
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const genRes = await fetch(`${baseUrl}/api/generate-content`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content_item_id }),
    });

    if (!genRes.ok) {
      return NextResponse.json({ error: "Reset succeeded but generation failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[/api/regenerate]", error);
    return NextResponse.json({ error: "Regenerate failed" }, { status: 500 });
  }
}
