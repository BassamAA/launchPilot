import { NextRequest, NextResponse } from "next/server";
import { getAuthorizedContentItem, getSupabaseAdminClient, getUser } from "@/lib/supabase";
import { ApproveRequest } from "@/types";
import { publishContentItem } from "@/lib/publishing";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { content_item_id, edited_body }: ApproveRequest = await req.json();
    if (!content_item_id) {
      return NextResponse.json({ error: "content_item_id required" }, { status: 400 });
    }

    const authorizedItem = await getAuthorizedContentItem(content_item_id);
    if (!authorizedItem) {
      return NextResponse.json({ error: "Content item not found" }, { status: 404 });
    }

    const supabase = getSupabaseAdminClient();
    if (edited_body !== undefined) {
      await supabase
        .from("content_items")
        .update({
          body: edited_body,
          updated_at: new Date().toISOString(),
        })
        .eq("id", content_item_id);
    }

    const result = await publishContentItem(content_item_id, "approve", supabase);
    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || result.message || "Approval failed",
          redirect_url: result.redirectUrl,
          status: result.status,
        },
        { status: result.status === "needs_connection" ? 409 : 500 }
      );
    }

    return NextResponse.json({
      success: true,
      status: result.status,
      published_url: result.publishedUrl || null,
      redirect_url: result.redirectUrl || null,
      message: result.message || null,
    });
  } catch (error) {
    console.error("[/api/approve]", error);
    return NextResponse.json({ error: "Approval failed" }, { status: 500 });
  }
}
