import { getSupabaseAdminClient } from "@/lib/supabase";
import { generateAndSaveContentItem } from "@/lib/generators/content";

export async function getNextDraftableItem(siteId: string) {
  const supabase = getSupabaseAdminClient();
  const { data: item } = await supabase
    .from("content_items")
    .select("*")
    .eq("site_id", siteId)
    .neq("channel", "blog")
    .order("scheduled_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  return item;
}

export async function generateNextDraft(siteId: string): Promise<{ success: false; error: string } | { success: true; item: any }> {
  const item = await getNextDraftableItem(siteId);
  if (!item) {
    return { success: false as const, error: "No content item found to draft." };
  }

  const supabase = getSupabaseAdminClient();

  if (!item.body) {
    const result = await generateAndSaveContentItem(item.id, supabase);
    if (!result.success) return { success: false as const, error: result.error || "Generation failed" };
  }

  const { data: refreshed } = await supabase
    .from("content_items")
    .select("*")
    .eq("id", item.id)
    .single();

  return { success: true as const, item: refreshed || item };
}

export async function approveDraft(contentItemId: string, editedBody?: string) {
  const supabase = getSupabaseAdminClient();

  if (editedBody !== undefined) {
    await supabase
      .from("content_items")
      .update({ body: editedBody, updated_at: new Date().toISOString() })
      .eq("id", contentItemId);
  }

  const { publishContentItem } = await import("@/lib/publishing");
  return publishContentItem(contentItemId, "approve", supabase);
}

export async function regenerateDraft(contentItemId: string) {
  const supabase = getSupabaseAdminClient();
  await supabase
    .from("content_items")
    .update({
      status: "draft",
      body: "",
      published_date: null,
      published_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", contentItemId);

  return generateAndSaveContentItem(contentItemId, supabase);
}
