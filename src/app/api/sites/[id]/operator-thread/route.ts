import { NextRequest, NextResponse } from "next/server";
import { getAuthorizedSite, getUser, getSupabaseAdminClient } from "@/lib/supabase";
import { appendOperatorMessage, getOrCreateOperatorThread, seedOperatorMemoryFromSite } from "@/lib/operator";
import { generateNextDraft } from "@/lib/operator-actions";
import { getChannelHandoff } from "@/lib/channel-publishing";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const site = await getAuthorizedSite(params.id);
    if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

    const supabase = getSupabaseAdminClient();
    const { data: fullSite } = await supabase
      .from("sites")
      .select("id, name, url, brief_json")
      .eq("id", site.id)
      .single();

    await seedOperatorMemoryFromSite((fullSite || site) as never);
    const thread = await getOrCreateOperatorThread(site.id, "web_chat");
    const { data: messages } = await supabase
      .from("operator_messages")
      .select("*")
      .eq("thread_id", thread.id)
      .order("created_at", { ascending: true })
      .limit(100);

    return NextResponse.json({ thread, messages: messages || [] });
  } catch (error) {
    console.error("[/api/sites/[id]/operator-thread][GET]", error);
    return NextResponse.json({ error: "Failed to load operator thread" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const site = await getAuthorizedSite(params.id);
    if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

    const { body } = await req.json();
    if (!body?.trim()) return NextResponse.json({ error: "body required" }, { status: 400 });

    const supabase = getSupabaseAdminClient();
    const { data: fullSite } = await supabase
      .from("sites")
      .select("id, name, url, brief_json")
      .eq("id", site.id)
      .single();

    await seedOperatorMemoryFromSite((fullSite || site) as never);
    const thread = await getOrCreateOperatorThread(site.id, "web_chat");

    await appendOperatorMessage({
      threadId: thread.id,
      siteId: site.id,
      role: "user",
      surface: "web_chat",
      body: body.trim(),
      messageType: "chat",
    });

    const lower = body.toLowerCase();
    const siteRecord = (fullSite || site) as { name?: string; url?: string; brief_json?: unknown };
    const siteName = siteRecord.name || siteRecord.url || "this business";
    let reply = `I understand. I’ll use that in future recommendations for ${siteName}.`;
    let replyMeta: Record<string, unknown> = {};

    if (lower.includes("what do you know") || lower.includes("my business")) {
      const brief = siteRecord.brief_json as { one_liner?: string; target_customer?: string; value_proposition?: string } | null;
      reply = [
        `Here’s what I currently know about ${siteName}:`,
        brief?.one_liner ? `- What you do: ${brief.one_liner}` : null,
        brief?.target_customer ? `- Audience: ${brief.target_customer}` : null,
        brief?.value_proposition ? `- Value: ${brief.value_proposition}` : null,
        `- Website: ${siteRecord.url || "Unknown"}`,
      ].filter(Boolean).join("\n");
    } else if (lower.includes("what should we do this week")) {
      reply = `This week, the best move is to ship consistently: one LinkedIn post, one X post, and one stronger evergreen asset from your positioning. I can draft the next one now.`;
    } else if (lower.includes("draft next post") || lower.includes("draft a post") || lower.includes("what should i post") || lower.includes("draft next")) {
      const draft = await generateNextDraft(site.id);
      if (!draft.success) {
        reply = "I couldn’t find a draftable item right now.";
      } else {
        const item = draft.item;
        const handoff = getChannelHandoff(item.channel, item.body || "", item.metadata_json as never);
        reply = [
          `I drafted your next ${handoff.label} post:`,
          "",
          item.body || "No draft body available.",
          "",
          `Action: ${handoff.actionLabel}`,
          handoff.url ? `Link: ${handoff.url}` : "Link: no direct handoff available",
          `Note: ${handoff.fallbackHint}`,
        ].join("\n");
        replyMeta = {
          kind: "draft_suggestion",
          content_item_id: item.id,
          handoff,
        };
      }
    } else if (lower.includes("linkedin")) {
      reply = `LinkedIn is a good fit when you want higher-trust, founder-led distribution. Ask me to 'draft next post' and I’ll generate one.`;
    } else if (lower.includes("queue")) {
      reply = `Use Queue to review, approve, and mark posts complete. I can also draft the next suggested post from here.`;
    }

    await appendOperatorMessage({
      threadId: thread.id,
      siteId: site.id,
      role: "assistant",
      surface: "web_chat",
      body: reply,
      messageType: "chat",
      metadataJson: replyMeta,
    });

    const { data: messages } = await supabase
      .from("operator_messages")
      .select("*")
      .eq("thread_id", thread.id)
      .order("created_at", { ascending: true })
      .limit(100);

    return NextResponse.json({ success: true, thread, messages: messages || [] });
  } catch (error) {
    console.error("[/api/sites/[id]/operator-thread][POST]", error);
    return NextResponse.json({ error: "Failed to send operator message" }, { status: 500 });
  }
}
