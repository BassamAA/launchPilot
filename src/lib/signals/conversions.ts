import { subDays } from "date-fns";
import { recordGrowthSignal } from "@/lib/growth";
import { getSupabaseAdminClient } from "@/lib/supabase";

type SupabaseAdmin = ReturnType<typeof getSupabaseAdminClient>;

interface ConversionSignalInput {
  siteId: string;
  trackedLinkId?: string | null;
  contentItemId?: string | null;
  experimentId?: string | null;
  channel?: "blog" | "twitter" | "reddit" | "email" | "tiktok" | "directory" | null;
  eventType: string;
  metadata?: Record<string, unknown>;
}

export async function processConversionSignal(
  input: ConversionSignalInput,
  supabase = getSupabaseAdminClient()
) {
  await recordGrowthSignal(
    {
      siteId: input.siteId,
      contentItemId: input.contentItemId || null,
      experimentId: input.experimentId || null,
      channel: input.channel || null,
      signalType: "conversion",
      metricName: input.eventType,
      metricValue: 1,
      source: "conversion_track",
      metadata: {
        tracked_link_id: input.trackedLinkId || null,
        ...(input.metadata || {}),
      },
    },
    supabase
  );

  if (!input.experimentId) return;

  const experimentId = input.experimentId;
  const conversionWindowStart = subDays(new Date(), 7).toISOString();

  const [{ data: experiment }, { count: conversions7d }, { data: trackedLinks }] = await Promise.all([
    supabase
      .from("growth_experiments")
      .select("id, confidence, metadata_json, next_action")
      .eq("id", experimentId)
      .maybeSingle(),
    supabase
      .from("conversions")
      .select("*", { count: "exact", head: true })
      .eq("experiment_id", experimentId)
      .gte("converted_at", conversionWindowStart),
    supabase
      .from("tracked_links")
      .select("click_count")
      .eq("experiment_id", experimentId),
  ]);

  if (!experiment) return;

  const metadata = (experiment.metadata_json || {}) as Record<string, unknown>;
  const totalClicks = (trackedLinks || []).reduce((sum, link) => sum + (link.click_count || 0), 0);
  const totalConversions = toNumber(conversions7d);
  const updates: Record<string, unknown> = {};

  const boostedAt = metadata.conversion_boosted_at;
  if (totalConversions >= 3 && !boostedAt) {
    updates.confidence = Math.min(95, Number(experiment.confidence || 50) + 10);
    updates.metadata_json = {
      ...metadata,
      conversion_boosted_at: new Date().toISOString(),
      conversions_last_7_days: totalConversions,
    };
    updates.last_reviewed_at = new Date().toISOString();
  }

  if (totalClicks >= 50 && totalConversions === 0 && !metadata.underperforming_click_flagged_at) {
    updates.confidence = Math.max(10, Number(updates.confidence ?? experiment.confidence ?? 50) - 10);
    updates.next_action =
      "High click volume but no signups. Rework the offer, landing experience, or channel positioning before adding more volume.";
    updates.metadata_json = {
      ...(updates.metadata_json as Record<string, unknown> | undefined || metadata),
      underperforming_click_flagged_at: new Date().toISOString(),
      clicks_without_conversions: totalClicks,
    };
    updates.last_reviewed_at = new Date().toISOString();
  }

  if (Object.keys(updates).length > 0) {
    await supabase.from("growth_experiments").update(updates).eq("id", experimentId);
  }
}

function toNumber(value: number | null) {
  return Number.isFinite(value as number) ? Number(value) : 0;
}
