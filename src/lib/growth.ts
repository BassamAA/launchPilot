import { buildMarketingSystemPrompt, callClaude } from "@/lib/claude";
import { buildContentPatternSummary, getLatestPatternSnapshot } from "@/lib/content-patterns";
import { getSupabaseAdminClient } from "@/lib/supabase";
import {
  ContentChannel,
  Conversion,
  GrowthExperiment,
  GrowthSignal,
  MarketingBrief,
  PlanStrategy,
  TrackedLink,
} from "@/types";

type SupabaseAdmin = ReturnType<typeof getSupabaseAdminClient>;

type AutoExperimentSource = "launchpilot_seed" | "launchpilot_reprioritize";

interface GrowthSignalInput {
  siteId: string;
  contentItemId?: string | null;
  experimentId?: string | null;
  channel?: ContentChannel | null;
  signalType: string;
  metricName: string;
  metricValue?: number;
  source?: string;
  metadata?: Record<string, unknown>;
}

interface ExperimentSuggestion {
  hypothesis: string;
  target_channel: ContentChannel | null;
  success_metric: string;
  confidence: number;
  rationale: string;
  next_action: string;
}

interface GrowthOverview {
  experiments: GrowthExperiment[];
  recentSignals: GrowthSignal[];
  signalSummary: {
    published: number;
    failed: number;
    approved: number;
    emailsSent: number;
    clicks: number;
    conversions: number;
    activated: number;
    revenue: number;
    topChannels: Array<{ channel: string; count: number }>;
  };
}

interface ReprioritizedGrowthResult extends GrowthOverview {
  summary: string;
}

function clampConfidence(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function dedupeChannels(channels: Array<ContentChannel | null | undefined>) {
  return Array.from(new Set(channels.filter(Boolean))) as ContentChannel[];
}

function topChannelsFromStrategy(brief: MarketingBrief, strategy?: PlanStrategy | null) {
  const fromStrategy = dedupeChannels(strategy?.channel_theses?.map((thesis) => thesis.channel) || []);
  if (fromStrategy.length > 0) return fromStrategy;
  return dedupeChannels(
    brief.recommended_channels
      ?.sort((a, b) => a.priority - b.priority)
      .slice(0, 4)
      .map((channel) => channel.channel) || []
  );
}

function buildSeedExperiments(
  brief: MarketingBrief,
  strategy: PlanStrategy | null | undefined
): ExperimentSuggestion[] {
  const channelTheses = strategy?.channel_theses || [];
  const strategicBets = strategy?.strategic_bets || [];
  const topChannels = topChannelsFromStrategy(brief, strategy);

  const experiments = channelTheses.slice(0, 4).map((thesis, index) => ({
    hypothesis: `${thesis.channel} can become a repeatable acquisition channel for ${brief.product_name}.`,
    target_channel: thesis.channel,
    success_metric: thesis.success_signal,
    confidence: clampConfidence(74 - index * 6),
    rationale: thesis.rationale,
    next_action:
      strategicBets[index] ||
      `Ship the next 3 ${thesis.channel} assets and watch for approval, publishing, and traffic signals.`,
  }));

  if (experiments.length > 0) {
    return experiments;
  }

  return topChannels.slice(0, 4).map((channel, index) => ({
    hypothesis: `${channel} is the fastest way for ${brief.product_name} to reach ${brief.target_customer}.`,
    target_channel: channel,
    success_metric: `More qualified traffic and confirmed publishing wins from ${channel}.`,
    confidence: clampConfidence(68 - index * 5),
    rationale: `The brief suggests ${channel} matches the current acquisition wedge best.`,
    next_action: `Double down on ${channel} and evaluate the next 7 days of publishing results.`,
  }));
}

async function replaceAutoExperiments(
  siteId: string,
  source: AutoExperimentSource,
  experiments: ExperimentSuggestion[],
  supabase: SupabaseAdmin
) {
  await supabase
    .from("growth_experiments")
    .update({
      status: "paused",
      metadata_json: { superseded_by: source },
      last_reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("site_id", siteId)
    .in("source", ["launchpilot_seed", "launchpilot_reprioritize"])
    .eq("status", "active");

  if (experiments.length === 0) return [];

  const rows = experiments.map((experiment) => ({
    site_id: siteId,
    hypothesis: experiment.hypothesis,
    target_channel: experiment.target_channel,
    success_metric: experiment.success_metric,
    status: "active",
    confidence: clampConfidence(experiment.confidence),
    rationale: experiment.rationale,
    next_action: experiment.next_action,
    source,
    metadata_json: {},
    last_reviewed_at: new Date().toISOString(),
  }));

  const { data } = await supabase
    .from("growth_experiments")
    .insert(rows)
    .select("*");

  return (data || []) as GrowthExperiment[];
}

export async function recordGrowthSignal(
  input: GrowthSignalInput,
  supabase = getSupabaseAdminClient()
) {
  await supabase.from("growth_signals").insert({
    site_id: input.siteId,
    content_item_id: input.contentItemId || null,
    experiment_id: input.experimentId || null,
    channel: input.channel || null,
    signal_type: input.signalType,
    metric_name: input.metricName,
    metric_value: input.metricValue ?? 1,
    source: input.source || "runtime",
    metadata_json: input.metadata || {},
  });
}

export async function seedGrowthExperimentsFromStrategy(
  siteId: string,
  brief: MarketingBrief,
  strategy: PlanStrategy,
  supabase = getSupabaseAdminClient()
) {
  const experiments = buildSeedExperiments(brief, strategy);
  const inserted = await replaceAutoExperiments(siteId, "launchpilot_seed", experiments, supabase);

  await recordGrowthSignal(
    {
      siteId,
      signalType: "strategy_seeded",
      metricName: "seeded_experiments",
      metricValue: inserted.length,
      source: "launchpilot_seed",
      metadata: { experiment_count: inserted.length },
    },
    supabase
  );

  return inserted;
}

async function getSiteGrowthSnapshot(siteId: string, supabase: SupabaseAdmin) {
  const [
    { data: site },
    { data: latestPlan },
    { data: contentItems },
    { data: emailSends },
    { data: trackedLinks },
    { data: conversions },
    { data: productEvents },
    { data: recentSignals },
  ] = await Promise.all([
      supabase.from("sites").select("id, name, brief_json").eq("id", siteId).single(),
      supabase
        .from("marketing_plans")
        .select("strategy_json, created_at")
        .eq("site_id", siteId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("content_items")
        .select("id, channel, status, scheduled_date, published_date, auto_executable, metadata_json")
        .eq("site_id", siteId),
      supabase.from("email_sends").select("status").eq("site_id", siteId),
      supabase.from("tracked_links").select("id, channel, click_count").eq("site_id", siteId),
      supabase.from("conversions").select("id, channel, tracked_link_id").eq("site_id", siteId),
      supabase.from("product_events").select("event_type, channel, event_value").eq("site_id", siteId),
      supabase
        .from("growth_signals")
        .select("*")
        .eq("site_id", siteId)
        .order("occurred_at", { ascending: false })
        .limit(20),
    ]);

  const brief = (site?.brief_json || null) as MarketingBrief | null;
  const strategy = (latestPlan?.strategy_json || null) as PlanStrategy | null;
  const items = (contentItems || []) as Array<{
    id: string;
    channel: ContentChannel;
    status: string;
    scheduled_date: string | null;
    published_date: string | null;
    auto_executable: boolean;
    metadata_json: Record<string, unknown>;
  }>;

  const itemSummary = items.reduce<Record<string, number>>((acc, item) => {
    const key = `${item.channel}:${item.status}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const publishedByChannel = items.reduce<Record<string, number>>((acc, item) => {
    if (item.status === "published") {
      acc[item.channel] = (acc[item.channel] || 0) + 1;
    }
    return acc;
  }, {});

  const failedByChannel = items.reduce<Record<string, number>>((acc, item) => {
    if (item.status === "failed") {
      acc[item.channel] = (acc[item.channel] || 0) + 1;
    }
    return acc;
  }, {});

  const emailStats = (emailSends || []).reduce<Record<string, number>>((acc, send) => {
    acc[send.status] = (acc[send.status] || 0) + 1;
    return acc;
  }, {});

  const clicksByChannel = ((trackedLinks || []) as Array<Pick<TrackedLink, "channel" | "click_count">>).reduce<
    Record<string, number>
  >((acc, link) => {
    acc[link.channel] = (acc[link.channel] || 0) + Number(link.click_count || 0);
    return acc;
  }, {});

  const conversionsByChannel = ((conversions || []) as Array<Pick<Conversion, "channel">>).reduce<
    Record<string, number>
  >((acc, conversion) => {
    const channel = conversion.channel || "unknown";
    acc[channel] = (acc[channel] || 0) + 1;
    return acc;
  }, {});

  const activationsByChannel = ((productEvents || []) as Array<{ event_type: string; channel: string | null }>).reduce<
    Record<string, number>
  >((acc, event) => {
    if (!["onboarding_complete", "activated"].includes(event.event_type)) return acc;
    const channel = event.channel || "unknown";
    acc[channel] = (acc[channel] || 0) + 1;
    return acc;
  }, {});

  const revenueByChannel = ((productEvents || []) as Array<{ event_type: string; channel: string | null; event_value: number }>).reduce<
    Record<string, number>
  >((acc, event) => {
    if (event.event_type !== "subscribed") return acc;
    const channel = event.channel || "unknown";
    acc[channel] = (acc[channel] || 0) + Number(event.event_value || 0);
    return acc;
  }, {});

  return {
    brief,
    strategy,
    itemSummary,
    publishedByChannel,
    failedByChannel,
    emailStats,
    clicksByChannel,
    conversionsByChannel,
    activationsByChannel,
    revenueByChannel,
    recentSignals: (recentSignals || []) as GrowthSignal[],
  };
}

function buildFallbackReprioritizedExperiments(
  brief: MarketingBrief,
  strategy: PlanStrategy | null,
  snapshot: Awaited<ReturnType<typeof getSiteGrowthSnapshot>>
) {
  const rankedChannels = dedupeChannels([
    ...Object.entries(snapshot.revenueByChannel)
      .sort(([, a], [, b]) => b - a)
      .map(([channel]) => channel as ContentChannel),
    ...Object.entries(snapshot.activationsByChannel)
      .sort(([, a], [, b]) => b - a)
      .map(([channel]) => channel as ContentChannel),
    ...Object.entries(snapshot.conversionsByChannel)
      .sort(([, a], [, b]) => b - a)
      .map(([channel]) => channel as ContentChannel),
    ...Object.entries(snapshot.clicksByChannel)
      .sort(([, a], [, b]) => b - a)
      .map(([channel]) => channel as ContentChannel),
    ...Object.entries(snapshot.publishedByChannel)
      .sort(([, a], [, b]) => b - a)
      .map(([channel]) => channel as ContentChannel),
    ...topChannelsFromStrategy(brief, strategy),
  ]);

  return rankedChannels.slice(0, 4).map((channel, index) => {
    const publishedCount = snapshot.publishedByChannel[channel] || 0;
    const failedCount = snapshot.failedByChannel[channel] || 0;
    const clickCount = snapshot.clicksByChannel[channel] || 0;
    const conversionCount = snapshot.conversionsByChannel[channel] || 0;
    const activationCount = snapshot.activationsByChannel[channel] || 0;
    const revenueValue = snapshot.revenueByChannel[channel] || 0;
    const outcomeScore = revenueValue * 2 + activationCount * 20 + conversionCount * 12 + clickCount * 2 + publishedCount * 3 - failedCount * 4;

    return {
      hypothesis:
        revenueValue > 0
          ? `${channel} is producing paying customers and deserves more volume plus tighter activation loops.`
          : activationCount > 0
            ? `${channel} is producing activated users, not just signups, and should get more emphasis.`
        : conversionCount > 0
          ? `${channel} is already converting attention into signups and should get more volume.`
          : clickCount > 0
            ? `${channel} is creating traffic, but the message and conversion path need tightening.`
            : outcomeScore > 0
              ? `${channel} is showing the strongest proof of execution and should get more volume.`
          : `${channel} still deserves a focused test, but the messaging or distribution needs refinement.`,
      target_channel: channel,
      success_metric:
        revenueValue > 0
          ? `Increase ${channel} revenue contribution beyond ${revenueValue} while keeping activation quality high.`
          : activationCount > 0
            ? `Increase ${channel} activated-user count beyond ${activationCount} while keeping conversion quality high.`
        : conversionCount > 0
          ? `Increase ${channel} signups beyond ${conversionCount} while holding click-to-conversion quality.`
          : clickCount > 0
            ? `Turn ${clickCount} ${channel} clicks into the first reliable conversions.`
            : publishedCount > 0
              ? `Increase published ${channel} items beyond ${publishedCount} while keeping failure rates low.`
          : `Get the first reliable published wins from ${channel}.`,
      confidence: clampConfidence(64 - index * 6 + conversionCount * 8 + activationCount * 10 + Math.round(revenueValue / 10) + clickCount - failedCount * 5),
      rationale:
        revenueValue > 0
          ? `${channel} is already tied to ${revenueValue} in tracked revenue value, which matters more than surface-level engagement.`
          : activationCount > 0
            ? `${channel} has already produced ${activationCount} downstream activation event${activationCount === 1 ? "" : "s"}, which is stronger proof than signups alone.`
        : conversionCount > 0
          ? `${channel} has already produced ${conversionCount} tracked conversion${conversionCount === 1 ? "" : "s"}, which matters more than raw engagement.`
          : clickCount > 0
            ? `${channel} is generating ${clickCount} tracked click${clickCount === 1 ? "" : "s"}, so there is distribution proof even before conversion proof.`
            : publishedCount > 0
              ? `${channel} already has ${publishedCount} published item${publishedCount === 1 ? "" : "s"}, making it the clearest place to double down next.`
          : `The strategy still points to ${channel} as a viable acquisition surface for ${brief.target_customer}.`,
      next_action:
        revenueValue > 0
          ? `Ship the next 3 ${channel} assets around the same offer and landing path, then validate whether revenue keeps compounding.`
          : activationCount > 0
            ? `Keep ${channel} active, preserve the winning hook, and tune the onboarding path so more signups activate.`
        : conversionCount > 0
          ? `Ship the next 3 ${channel} assets with the same CTA pattern and tighter positioning, then validate whether conversions keep compounding.`
          : clickCount > 0
            ? `Keep ${channel} active, tighten the CTA and landing hook, and test the next 3 assets against conversion quality.`
            : failedCount > 0
              ? `Review the last failed or stalled ${channel} executions, tighten the hook, and rerun the next 3 assets.`
          : `Ship the next 3 ${channel} assets and measure publish throughput plus downstream response.`,
    };
  });
}

function normalizeReprioritizedExperiments(
  raw: unknown,
  fallback: ExperimentSuggestion[]
) {
  const data = raw as
    | {
        summary?: string;
        experiments?: Array<{
          hypothesis?: string;
          target_channel?: ContentChannel | null;
          success_metric?: string;
          confidence?: number;
          rationale?: string;
          next_action?: string;
        }>;
      }
    | null;

  const experiments = data?.experiments
    ?.filter((experiment) => experiment?.hypothesis && experiment?.success_metric)
    .slice(0, 5)
    .map((experiment, index) => ({
      hypothesis: experiment.hypothesis!,
      target_channel: experiment.target_channel || fallback[index]?.target_channel || null,
      success_metric: experiment.success_metric!,
      confidence: clampConfidence(experiment.confidence ?? fallback[index]?.confidence ?? 60),
      rationale: experiment.rationale || fallback[index]?.rationale || "Prioritized from recent execution signals.",
      next_action: experiment.next_action || fallback[index]?.next_action || "Run the next batch and review the signals.",
    }));

  return {
    summary:
      data?.summary ||
      "LaunchPilot reprioritized the growth bets using the latest conversion, click, and publishing signals.",
    experiments: experiments && experiments.length > 0 ? experiments : fallback,
  };
}

export async function getGrowthOverview(
  siteId: string,
  supabase = getSupabaseAdminClient()
): Promise<GrowthOverview> {
  const [{ data: experiments }, { data: signals }] = await Promise.all([
    supabase
      .from("growth_experiments")
      .select("*")
      .eq("site_id", siteId)
      .eq("status", "active")
      .order("confidence", { ascending: false })
      .limit(5),
    supabase
      .from("growth_signals")
      .select("*")
      .eq("site_id", siteId)
      .order("occurred_at", { ascending: false })
      .limit(12),
  ]);

  const recentSignals = (signals || []) as GrowthSignal[];
  const topChannelMap = recentSignals.reduce<Record<string, number>>((acc, signal) => {
    if (signal.channel) {
      acc[signal.channel] = (acc[signal.channel] || 0) + 1;
    }
    return acc;
  }, {});

  return {
    experiments: (experiments || []) as GrowthExperiment[],
    recentSignals,
    signalSummary: {
      published: recentSignals.filter((signal) => signal.signal_type === "published").length,
      failed: recentSignals.filter((signal) => signal.signal_type === "publish_failed").length,
      approved: recentSignals.filter((signal) => signal.signal_type === "approved").length,
      emailsSent: recentSignals
        .filter((signal) => signal.signal_type === "email_sent")
        .reduce((sum, signal) => sum + Number(signal.metric_value || 0), 0),
      clicks: recentSignals
        .filter((signal) => signal.metric_name === "link_click")
        .reduce((sum, signal) => sum + Number(signal.metric_value || 0), 0),
      conversions: recentSignals
        .filter((signal) => signal.signal_type === "conversion")
        .reduce((sum, signal) => sum + Number(signal.metric_value || 0), 0),
      activated: recentSignals
        .filter((signal) => signal.metric_name === "activated" || signal.metric_name === "onboarding_complete")
        .reduce((sum, signal) => sum + Number(signal.metric_value || 0), 0),
      revenue: recentSignals
        .filter((signal) => signal.signal_type === "revenue" || signal.metric_name === "subscribed")
        .reduce((sum, signal) => sum + Number(signal.metric_value || 0), 0),
      topChannels: Object.entries(topChannelMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 4)
        .map(([channel, count]) => ({ channel, count })),
    },
  };
}

export async function reprioritizeGrowthExperiments(
  siteId: string,
  supabase = getSupabaseAdminClient()
): Promise<ReprioritizedGrowthResult> {
  const [snapshot, patternSnapshot] = await Promise.all([
    getSiteGrowthSnapshot(siteId, supabase),
    getLatestPatternSnapshot(siteId, supabase),
  ]);
  if (!snapshot.brief) {
    throw new Error("Brief is required before reprioritizing growth bets.");
  }

  const fallbackExperiments = buildFallbackReprioritizedExperiments(
    snapshot.brief,
    snapshot.strategy,
    snapshot
  );

  let summary =
    "LaunchPilot reprioritized the growth bets using the latest conversion, click, and publishing signals.";
  let experiments: ExperimentSuggestion[] = fallbackExperiments;

  try {
    const result = await callClaude<{
      summary: string;
      experiments: ExperimentSuggestion[];
    }>({
      model: "sonnet",
      systemPrompt: buildMarketingSystemPrompt(snapshot.brief),
      userPrompt: `You are reprioritizing growth bets for LaunchPilot.

Product: ${snapshot.brief.product_name}
Target customer: ${snapshot.brief.target_customer}
Value proposition: ${snapshot.brief.value_proposition}
Current overview: ${snapshot.strategy?.overview || "No strategy overview yet"}
Current growth thesis: ${snapshot.strategy?.growth_thesis || "Not available"}
Acquisition wedge: ${snapshot.strategy?.acquisition_wedge || "Not available"}

Published by channel: ${JSON.stringify(snapshot.publishedByChannel)}
Failed by channel: ${JSON.stringify(snapshot.failedByChannel)}
Clicks by channel: ${JSON.stringify(snapshot.clicksByChannel)}
Conversions by channel: ${JSON.stringify(snapshot.conversionsByChannel)}
Activations by channel: ${JSON.stringify(snapshot.activationsByChannel)}
Revenue by channel: ${JSON.stringify(snapshot.revenueByChannel)}
Item summary: ${JSON.stringify(snapshot.itemSummary)}
Email stats: ${JSON.stringify(snapshot.emailStats)}
${buildContentPatternSummary(patternSnapshot)}
Recent growth signals: ${JSON.stringify(
  snapshot.recentSignals.map((signal) => ({
    signal_type: signal.signal_type,
    channel: signal.channel,
    metric_name: signal.metric_name,
    metric_value: signal.metric_value,
    occurred_at: signal.occurred_at,
  }))
)}

Return valid JSON with:
{
  "summary": "1-2 sentence summary of what LaunchPilot should do next",
  "experiments": [
    {
      "hypothesis": "A sharp, testable growth bet",
      "target_channel": "blog|twitter|reddit|email|tiktok|directory|null",
      "success_metric": "The specific signal proving this bet works",
      "confidence": 0,
      "rationale": "Why this bet is being prioritized now",
      "next_action": "What LaunchPilot should do next"
    }
  ]
}

Prioritize 4 experiments max. Bias toward channels that are producing revenue first, activation second, conversions third, clicks fourth, and raw engagement last. If a channel has clicks but no downstream outcomes, focus on improving the CTA or landing match instead of only increasing volume. Do not return markdown fences.`,
      maxTokens: 2048,
      retries: 0,
    });

    const normalized = normalizeReprioritizedExperiments(result.data, fallbackExperiments);
    summary = normalized.summary;
    experiments = normalized.experiments;
  } catch {
    // Fall back to deterministic reprioritization using runtime signals.
  }

  const inserted = await replaceAutoExperiments(siteId, "launchpilot_reprioritize", experiments, supabase);

  await supabase.from("activity_log").insert({
    site_id: siteId,
    action: "growth_reprioritized",
    description: "Growth bets reprioritized from execution signals",
    metadata_json: { experiment_count: inserted.length, summary },
  });

  await recordGrowthSignal(
    {
      siteId,
      signalType: "reprioritized",
      metricName: "reprioritizations",
      metricValue: 1,
      source: "launchpilot_reprioritize",
      metadata: { experiment_count: inserted.length },
    },
    supabase
  );

  const overview = await getGrowthOverview(siteId, supabase);
  return { ...overview, summary };
}
