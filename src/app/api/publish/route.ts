import { NextRequest, NextResponse } from "next/server";
import { getAuthorizedContentItem, getUser } from "@/lib/supabase";
import { markContentItemManualComplete, publishContentItem } from "@/lib/publishing";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { content_item_id, published_url }: { content_item_id?: string; published_url?: string } = await req.json();
    if (!content_item_id) {
      return NextResponse.json({ error: "content_item_id required" }, { status: 400 });
    }

    const authorizedItem = await getAuthorizedContentItem(content_item_id);
    if (!authorizedItem) {
      return NextResponse.json({ error: "Content item not found" }, { status: 404 });
    }

    if (["twitter", "blog"].includes((authorizedItem as { channel?: string }).channel || "")) {
      const result = await publishContentItem(content_item_id, "manual");
      if (!result.success) {
        return NextResponse.json(
          { error: result.error || result.message || "Publish failed", redirect_url: result.redirectUrl || null },
          { status: result.status === "needs_connection" ? 409 : 500 }
        );
      }

      return NextResponse.json({
        success: true,
        status: result.status,
        published_url: result.publishedUrl || null,
      });
    }

    const manualResult = await markContentItemManualComplete(
      content_item_id,
      {
        publishedUrl: published_url || null,
        action: "content_published",
        description: "Marked complete by user after manual publishing",
      }
    );

    if (!manualResult.success) {
      return NextResponse.json({ error: manualResult.error || "Publish failed" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      status: manualResult.status,
      published_url: manualResult.publishedUrl || null,
    });
  } catch (error) {
    console.error("[/api/publish]", error);
    return NextResponse.json({ error: "Publish failed" }, { status: 500 });
  }
}
