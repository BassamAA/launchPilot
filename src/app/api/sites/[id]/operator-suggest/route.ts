import { NextRequest, NextResponse } from "next/server";
import { getAuthorizedSite, getUser, getSupabaseAdminClient } from "@/lib/supabase";
import {
  appendOperatorMessage,
  buildPostSuggestionMessage,
  getOrCreateOperatorThread,
  queueOperatorOutboxMessage,
  seedOperatorMemoryFromSite,
} from "@/lib/operator";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const site = await getAuthorizedSite(params.id);
    if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

    const supabase = getSupabaseAdminClient();

    const { data: item } = await supabase
      .from("content_items")
      .select("*")
      .eq("site_id", site.id)
      .not("body", "eq", "")
      .neq("channel", "blog")
      .in("status", ["draft", "approved"])
      .order("scheduled_date", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!item) {
      return NextResponse.json({ error: "No draft available to suggest" }, { status: 404 });
    }

    await seedOperatorMemoryFromSite(site as never);
    const thread = await getOrCreateOperatorThread(site.id, "web_chat");
    const suggestion = buildPostSuggestionMessage(item as never);

    await appendOperatorMessage({
      threadId: thread.id,
      siteId: site.id,
      role: "assistant",
      surface: "web_chat",
      messageType: "suggestion",
      body: suggestion.body,
      metadataJson: suggestion.actionJson,
    });

    await queueOperatorOutboxMessage({
      siteId: site.id,
      threadId: thread.id,
      surface: "whatsapp",
      kind: "post_suggestion",
      title: suggestion.title,
      body: suggestion.body,
      actionJson: suggestion.actionJson,
    });

    return NextResponse.json({
      success: true,
      thread_id: thread.id,
      content_item_id: item.id,
      suggestion,
    });
  } catch (error) {
    console.error("[/api/sites/[id]/operator-suggest]", error);
    return NextResponse.json({ error: "Failed to create operator suggestion" }, { status: 500 });
  }
}
