import { getSupabaseAdminClient } from "@/lib/supabase";
import { ContentItem, Site } from "@/types";
import { getChannelHandoff } from "@/lib/channel-publishing";

export async function getOrCreateOperatorThread(siteId: string, surface = "web_chat") {
  const supabase = getSupabaseAdminClient();

  const { data: existing } = await supabase
    .from("operator_threads")
    .select("*")
    .eq("site_id", siteId)
    .eq("surface", surface)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return existing;

  const { data: created, error } = await supabase
    .from("operator_threads")
    .insert({ site_id: siteId, surface, status: "active" })
    .select("*")
    .single();

  if (error) throw error;
  return created;
}

export async function appendOperatorMessage({
  threadId,
  siteId,
  role,
  surface,
  body,
  messageType = "chat",
  metadataJson = {},
}: {
  threadId: string;
  siteId: string;
  role: "system" | "assistant" | "user";
  surface?: string;
  body: string;
  messageType?: string;
  metadataJson?: Record<string, unknown>;
}) {
  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();

  const { error } = await supabase.from("operator_messages").insert({
    thread_id: threadId,
    site_id: siteId,
    role,
    surface: surface || "web_chat",
    body,
    message_type: messageType,
    metadata_json: metadataJson,
  });

  if (error) throw error;

  await supabase
    .from("operator_threads")
    .update({ last_message_at: now, updated_at: now })
    .eq("id", threadId);
}

export async function upsertOperatorMemory({
  siteId,
  memoryType,
  key,
  valueText,
  valueJson,
  source,
  confidence = 1,
}: {
  siteId: string;
  memoryType: string;
  key: string;
  valueText?: string | null;
  valueJson?: Record<string, unknown> | null;
  source?: string;
  confidence?: number;
}) {
  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();

  const { error } = await supabase.from("operator_memory").upsert(
    {
      site_id: siteId,
      memory_type: memoryType,
      key,
      value_text: valueText || null,
      value_json: valueJson || null,
      source: source || null,
      confidence,
      updated_at: now,
    },
    { onConflict: "site_id,memory_type,key" }
  );

  if (error) throw error;
}

export async function seedOperatorMemoryFromSite(site: Site) {
  if (!site.id) return;

  await upsertOperatorMemory({
    siteId: site.id,
    memoryType: "business",
    key: "site_name",
    valueText: site.name,
    source: "site",
  });

  if (site.url) {
    await upsertOperatorMemory({
      siteId: site.id,
      memoryType: "business",
      key: "site_url",
      valueText: site.url,
      source: "site",
    });
  }

  if (site.brief_json) {
    await upsertOperatorMemory({
      siteId: site.id,
      memoryType: "brief",
      key: "current",
      valueJson: site.brief_json as unknown as Record<string, unknown>,
      source: "brief_json",
    });
  }
}

export function buildPostSuggestionMessage(item: ContentItem) {
  const handoff = getChannelHandoff(item.channel, item.body || "", item.metadata_json);
  const title = item.title ? `${handoff.label}: ${item.title}` : `${handoff.label} suggestion`;

  return {
    title,
    body: [
      `You should post this on ${handoff.label} today.`,
      "",
      item.body || "Draft not generated yet.",
      "",
      `Action: ${handoff.actionLabel}`,
      handoff.url ? `Link: ${handoff.url}` : "Link: no direct handoff available",
      `Note: ${handoff.fallbackHint}`,
    ].join("\n"),
    actionJson: {
      channel: item.channel,
      content_item_id: item.id,
      handoff,
    },
  };
}

export async function queueOperatorOutboxMessage({
  siteId,
  threadId,
  surface,
  kind,
  title,
  body,
  actionJson = {},
  scheduledFor,
}: {
  siteId: string;
  threadId?: string | null;
  surface: string;
  kind: string;
  title?: string;
  body: string;
  actionJson?: Record<string, unknown>;
  scheduledFor?: string | null;
}) {
  const supabase = getSupabaseAdminClient();

  const { error } = await supabase.from("operator_outbox").insert({
    site_id: siteId,
    thread_id: threadId || null,
    surface,
    kind,
    title: title || null,
    body,
    action_json: actionJson,
    scheduled_for: scheduledFor || null,
    status: "queued",
  });

  if (error) throw error;
}
