import { NextRequest, NextResponse } from "next/server";
import { getAuthorizedContentItem, getUser } from "@/lib/supabase";
import { publishContentItem } from "@/lib/publishing";

// POST /api/twitter/publish — manually publish a single Twitter content item
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content_item_id } = await req.json();
  if (!content_item_id) {
    return NextResponse.json({ error: "content_item_id required" }, { status: 400 });
  }

  const item = await getAuthorizedContentItem(content_item_id);
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const result = await publishContentItem(content_item_id, "manual");
  if (!result.success) {
    return NextResponse.json(
      { error: result.error || result.message || "Twitter publish failed" },
      { status: result.status === "needs_connection" ? 409 : 500 }
    );
  }

  return NextResponse.json({
    success: true,
    status: result.status,
    published_url: result.publishedUrl || null,
  });
}
