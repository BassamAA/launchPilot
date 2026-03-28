import { NextRequest, NextResponse } from "next/server";
import { getAuthorizedContentItem, getUser } from "@/lib/supabase";
import { markContentItemManualComplete, publishContentItem } from "@/lib/publishing";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const {
      content_item_id,
      published_url,
      edited_body,
      intent,
    }: { content_item_id?: string; published_url?: string; edited_body?: string; intent?: boolean } = await req.json();

    if (!content_item_id) {
      return NextResponse.json({ error: "content_item_id required" }, { status: 400 });
    }

    const authorizedItem = await getAuthorizedContentItem(content_item_id);
    if (!authorizedItem) {
      return NextResponse.json({ error: "Content item not found" }, { status: 404 });
    }

    // Save edited body if provided
    if (edited_body !== undefined) {
      const supabase = (await import("@/lib/supabase")).getSupabaseAdminClient();
      await supabase
        .from("content_items")
        .update({ body: edited_body, updated_at: new Date().toISOString() })
        .eq("id", content_item_id);
    }

    // intent=true: user opened the platform themselves, just mark as published
    const result = await markContentItemManualComplete(
      content_item_id,
      {
        publishedUrl: published_url || null,
        action: "content_published",
        description: intent ? "Published via platform intent" : "Marked complete by user",
      }
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Publish failed" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      status: result.status,
      published_url: result.publishedUrl || null,
    });
  } catch (error) {
    console.error("[/api/publish]", error);
    return NextResponse.json({ error: "Publish failed" }, { status: 500 });
  }
}
