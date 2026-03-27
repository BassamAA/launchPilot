import { subDays } from "date-fns";
import { recordGrowthSignal } from "@/lib/growth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { ContentChannel, GrowthSurfaceType, ProductEventType } from "@/types";

type SupabaseAdmin = ReturnType<typeof getSupabaseAdminClient>;

export const PRODUCT_EVENT_WEIGHTS: Record<ProductEventType, number> = {
  signup: 10,
  onboarding_complete: 20,
  activated: 35,
  subscribed: 60,
};

interface ProductEventInput {
  siteId: string;
  trackedLinkId?: string | null;
  contentItemId?: string | null;
  experimentId?: string | null;
  surfaceType?: GrowthSurfaceType | null;
  channel?: ContentChannel | null;
  eventType: ProductEventType;
  eventValue?: number;
  currency?: string | null;
  visitorHash?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  referrer?: string | null;
  metadata?: Record<string, unknown>;
}

export async function ensureDefaultActivationDefinitions(
  siteId: string,
  supabase = getSupabaseAdminClient()
) {
  const rows = [
    {
      site_id: siteId,
      event_key: "signup",
      display_name: "Signup",
      description: "A tracked signup or account creation.",
      weight: PRODUCT_EVENT_WEIGHTS.signup,
      is_primary: true,
    },
    {
      site_id: siteId,
      event_key: "onboarding_complete",
      display_name: "Onboarding Complete",
      description: "The user completed the onboarding flow.",
      weight: PRODUCT_EVENT_WEIGHTS.onboarding_complete,
      is_primary: false,
    },
    {
      site_id: siteId,
      event_key: "activated",
      display_name: "Activated",
      description: "The user hit the key activation milestone.",
      weight: PRODUCT_EVENT_WEIGHTS.activated,
      is_primary: false,
    },
    {
      site_id: siteId,
      event_key: "subscribed",
      display_name: "Subscribed",
      description: "The user became a paying customer.",
      weight: PRODUCT_EVENT_WEIGHTS.subscribed,
      is_primary: false,
    },
  ];

  await supabase.from("activation_definitions").upsert(rows, { onConflict: "site_id,event_key" });
}

export async function resolveSurfaceTypeForChannel(
  siteId: string,
  channel: ContentChannel | null | undefined,
  supabase = getSupabaseAdminClient()
) {
  if (!channel) return null;

  const { data } = await supabase
    .from("growth_surfaces")
    .select("surface_type, channels, status, priority")
    .eq("site_id", siteId)
    .in("status", ["active", "recommended"])
    .order("priority", { ascending: true });

  const match = (data || []).find((surface) => Array.isArray(surface.channels) && surface.channels.includes(channel));
  return (match?.surface_type as GrowthSurfaceType | undefined) || null;
}

export async function processProductEvent(
  input: ProductEventInput,
  supabase = getSupabaseAdminClient()
) {
  await ensureDefaultActivationDefinitions(input.siteId, supabase);

  await supabase.from("product_events").insert({
    site_id: input.siteId,
    tracked_link_id: input.trackedLinkId || null,
    content_item_id: input.contentItemId || null,
    experiment_id: input.experimentId || null,
    surface_type: input.surfaceType || null,
    channel: input.channel || null,
    event_type: input.eventType,
    event_value: input.eventValue ?? 1,
    currency: input.currency || null,
    visitor_hash: input.visitorHash || null,
    utm_source: input.utmSource || null,
    utm_medium: input.utmMedium || null,
    utm_campaign: input.utmCampaign || null,
    utm_content: input.utmContent || null,
    referrer: input.referrer || null,
    metadata_json: input.metadata || {},
  });

  const signalType = input.eventType === "subscribed" ? "revenue" : "activation";
  await recordGrowthSignal(
    {
      siteId: input.siteId,
      contentItemId: input.contentItemId || null,
      experimentId: input.experimentId || null,
      channel: input.channel || null,
      signalType,
      metricName: input.eventType,
      metricValue: input.eventValue ?? 1,
      source: "product_event",
      metadata: {
        tracked_link_id: input.trackedLinkId || null,
        surface_type: input.surfaceType || null,
        currency: input.currency || null,
        ...(input.metadata || {}),
      },
    },
    supabase
  );

  if (!input.experimentId) return;

  const eventWindowStart = subDays(new Date(), 14).toISOString();
  const [{ data: experiment }, { data: recentEvents }] = await Promise.all([
    supabase
      .from("growth_experiments")
      .select("id, confidence, metadata_json, next_action")
      .eq("id", input.experimentId)
      .maybeSingle(),
    supabase
      .from("product_events")
      .select("event_type, event_value")
      .eq("experiment_id", input.experimentId)
      .gte("occurred_at", eventWindowStart),
  ]);

  if (!experiment) return;

  const score = (recentEvents || []).reduce((sum, event) => {
    const type = event.event_type as ProductEventType;
    return sum + PRODUCT_EVENT_WEIGHTS[type] * Number(event.event_value || 1);
  }, 0);

  if (score <= 0) return;

  const metadata = (experiment.metadata_json || {}) as Record<string, unknown>;
  const nextConfidence = Math.min(98, Number(experiment.confidence || 50) + Math.max(3, Math.round(score / 20)));

  await supabase
    .from("growth_experiments")
    .update({
      confidence: nextConfidence,
      metadata_json: {
        ...metadata,
        product_outcome_score_14d: score,
        product_outcome_updated_at: new Date().toISOString(),
      },
      next_action:
        score >= 60
          ? "This bet is driving strong downstream outcomes. Increase volume and tighten the acquisition-to-activation path."
          : experiment.next_action,
      last_reviewed_at: new Date().toISOString(),
    })
    .eq("id", input.experimentId);
}
