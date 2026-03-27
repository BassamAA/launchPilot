import { NextRequest, NextResponse } from "next/server";
import { getAuthorizedContentItem, getUser, getSupabaseAdminClient } from "@/lib/supabase";
import { generateAndSaveContentItem } from "@/lib/generators/content";
import { GenerateContentRequest } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { content_item_id }: GenerateContentRequest = await req.json();
    if (!content_item_id) {
      return NextResponse.json({ error: "content_item_id required" }, { status: 400 });
    }

    const authorizedItem = await getAuthorizedContentItem(content_item_id);
    if (!authorizedItem) {
      return NextResponse.json({ error: "Content item not found" }, { status: 404 });
    }

    const supabase = getSupabaseAdminClient();
    const result = await generateAndSaveContentItem(content_item_id, supabase);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Content generation failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, content_item_id });
  } catch (error) {
    console.error("[/api/generate-content]", error);
    return NextResponse.json({ error: "Content generation failed" }, { status: 500 });
  }
}
