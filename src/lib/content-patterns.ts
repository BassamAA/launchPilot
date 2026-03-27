import { subDays } from "date-fns";
import { callClaude } from "@/lib/claude";
import { getSupabaseAdminClient } from "@/lib/supabase";
import {
  ContentChannel,
  ContentItem,
  ContentPatternCombination,
  ContentPatternMetric,
  ContentPatternSnapshot,
  ContentPatternSnapshotData,
  ContentPatternSummary,
  ContentPerformance,
  ContentTag,
  ContentTagCategory,
  Conversion,
  EmailSend,
  GrowthSignal,
  LinkClick,
  PageView,
  TrackedLink,
} from "@/types";

type SupabaseAdmin = ReturnType<typeof getSupabaseAdminClient>;

export const MIN_PATTERN_SAMPLE_SIZE = 10;

interface ItemMetrics {
  id: string;
  title: string;
  channel: ContentChannel;
  variant_group?: string | null;
  variant_label?: string | null;
  impressions: number;
  engagement: number;
  clicks: number;
  conversions: number;
  conversionRate: number;
}

function toNumber(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function buildMetric(tagValue: string, rows: ItemMetrics[]): ContentPatternMetric {
  const clicks = average(rows.map((row) => row.clicks));
  const conversions = average(rows.map((row) => row.conversions));
  const impressions = average(rows.map((row) => row.impressions));
  const engagement = average(rows.map((row) => row.engagement));
  const totalClicks = rows.reduce((sum, row) => sum + row.clicks, 0);
  const totalConversions = rows.reduce((sum, row) => sum + row.conversions, 0);

  return {
    tag_value: tagValue,
    sample_size: rows.length,
    avg_impressions: Math.round(impressions * 10) / 10,
    avg_engagement: Math.round(engagement * 10) / 10,
    avg_clicks: Math.round(clicks * 10) / 10,
    avg_conversions: Math.round(conversions * 10) / 10,
    conversion_rate: totalClicks ? Math.round((totalConversions / totalClicks) * 1000) / 10 : 0,
  };
}

function summarizeCategory(category: ContentTagCategory, grouped: Map<string, ItemMetrics[]>): ContentPatternSummary {
  const metrics = Array.from(grouped.entries())
    .map(([tagValue, rows]) => buildMetric(tagValue, rows))
    .sort((a, b) => b.conversion_rate - a.conversion_rate || b.avg_clicks - a.avg_clicks || b.sample_size - a.sample_size);

  return {
    category,
    best: metrics[0] || null,
    worst: metrics.length > 1 ? metrics[metrics.length - 1] : metrics[0] || null,
    metrics,
  };
}

function buildCombination(rows: Array<{ metrics: ItemMetrics; tags: Record<string, string> }>) {
  const grouped = new Map<string, Array<{ metrics: ItemMetrics; tags: Record<string, string> }>>();

  for (const row of rows) {
    const key = `${row.tags.hook_type || "unknown"}|${row.tags.cta_type || "unknown"}|${row.tags.tone || "unknown"}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(row);
  }

  const combinations: ContentPatternCombination[] = Array.from(grouped.entries()).map(([key, items]) => {
    const clicks = items.reduce((sum, item) => sum + item.metrics.clicks, 0);
    const conversions = items.reduce((sum, item) => sum + item.metrics.conversions, 0);
    return {
      key,
      label: `${items[0]?.tags.hook_type || "unknown"} hook + ${items[0]?.tags.cta_type || "unknown"} CTA + ${items[0]?.tags.tone || "unknown"} tone`,
      sample_size: items.length,
      avg_clicks: Math.round((clicks / items.length) * 10) / 10,
      avg_conversions: Math.round((conversions / items.length) * 10) / 10,
      conversion_rate: clicks ? Math.round((conversions / clicks) * 1000) / 10 : 0,
    };
  });

  combinations.sort((a, b) => b.conversion_rate - a.conversion_rate || b.avg_clicks - a.avg_clicks || b.sample_size - a.sample_size);
  return combinations;
}

async function buildLessonsLearned(snapshot: ContentPatternSnapshotData) {
  const hook = snapshot.tag_summaries.hook_type?.best?.tag_value || "pain_point";
  const cta = snapshot.tag_summaries.cta_type?.best?.tag_value || "direct_signup";
  const tone = snapshot.tag_summaries.tone?.best?.tag_value || "authoritative";
  const avoid = snapshot.patterns_to_avoid[0]?.label || "weak hook/CTA combinations";

  try {
    const result = await callClaude<{ summary: string }>({
      model: "haiku",
      systemPrompt: "You summarize performance patterns for a growth product. Return valid JSON only.",
      userPrompt: `Summarize this content intelligence snapshot in 2 short sentences for a founder.

Snapshot:
${JSON.stringify({
  sample_size: snapshot.sample_size,
  top_pattern: snapshot.top_pattern,
  best_hook: snapshot.tag_summaries.hook_type?.best,
  best_cta: snapshot.tag_summaries.cta_type?.best,
  best_tone: snapshot.tag_summaries.tone?.best,
  patterns_to_avoid: snapshot.patterns_to_avoid.slice(0, 2),
})}

Return:
{
  "summary": "plain-English lesson"
}`,
      maxTokens: 200,
      retries: 0,
    });

    return result.data.summary || "";
  } catch {
    return `Your audience is responding best to ${hook} hooks with ${cta} CTAs in a ${tone} tone. Avoid ${avoid} until the data says otherwise.`;
  }
}

async function getPublishedMetrics(
  siteId: string,
  supabase: SupabaseAdmin,
  since: string
): Promise<ItemMetrics[]> {
  const [
    { data: contentItems },
    { data: performanceRows },
    { data: pageViews },
    { data: emailSends },
    { data: trackedLinks },
    { data: linkClicks },
    { data: conversions },
  ] = await Promise.all([
    supabase
      .from("content_items")
      .select("id, title, channel, variant_group, variant_label")
      .eq("site_id", siteId)
      .eq("status", "published"),
    supabase
      .from("content_performance")
      .select("*")
      .eq("site_id", siteId)
      .gte("fetched_at", since)
      .order("fetched_at", { ascending: false }),
    supabase.from("page_views").select("*").eq("site_id", siteId).gte("viewed_at", since),
    supabase.from("email_sends").select("*").eq("site_id", siteId).gte("created_at", since),
    supabase.from("tracked_links").select("*").eq("site_id", siteId),
    supabase.from("link_clicks").select("*").eq("site_id", siteId).gte("clicked_at", since),
    supabase.from("conversions").select("*").eq("site_id", siteId).gte("converted_at", since),
  ]);

  const items = (contentItems || []) as Array<
    Pick<ContentItem, "id" | "title" | "channel" | "variant_group" | "variant_label">
  >;
  const trackedByItem = ((trackedLinks || []) as TrackedLink[]).reduce<Record<string, TrackedLink>>((acc, link) => {
    if (link.content_item_id) acc[link.content_item_id] = link;
    return acc;
  }, {});
  const clicksByLink = ((linkClicks || []) as LinkClick[]).reduce<Record<string, number>>((acc, click) => {
    acc[click.tracked_link_id] = (acc[click.tracked_link_id] || 0) + 1;
    return acc;
  }, {});
  const conversionsByLink = ((conversions || []) as Conversion[]).reduce<Record<string, number>>((acc, conversion) => {
    if (conversion.tracked_link_id) {
      acc[conversion.tracked_link_id] = (acc[conversion.tracked_link_id] || 0) + 1;
    }
    return acc;
  }, {});
  const conversionsByItem = ((conversions || []) as Conversion[]).reduce<Record<string, number>>((acc, conversion) => {
    if (conversion.content_item_id) {
      acc[conversion.content_item_id] = (acc[conversion.content_item_id] || 0) + 1;
    }
    return acc;
  }, {});
  const pageViewsByItem = ((pageViews || []) as PageView[]).reduce<Record<string, number>>((acc, view) => {
    acc[view.content_item_id] = (acc[view.content_item_id] || 0) + 1;
    return acc;
  }, {});
  const emailByItem = ((emailSends || []) as EmailSend[]).reduce<Record<string, EmailSend[]>>((acc, send) => {
    if (!acc[send.content_item_id]) acc[send.content_item_id] = [];
    acc[send.content_item_id].push(send);
    return acc;
  }, {});
  const latestTwitterByItem = ((performanceRows || []) as ContentPerformance[]).reduce<Record<string, ContentPerformance>>((acc, row) => {
    if (!acc[row.content_item_id]) acc[row.content_item_id] = row;
    return acc;
  }, {});

  return items
    .map((item) => {
      const trackedLink = trackedByItem[item.id];
      const clicks = trackedLink ? clicksByLink[trackedLink.id] || trackedLink.click_count || 0 : 0;
      const conversionCount = trackedLink ? conversionsByLink[trackedLink.id] || 0 : conversionsByItem[item.id] || 0;

      if (item.channel === "twitter") {
        const latest = latestTwitterByItem[item.id];
        const metrics = (latest?.metrics_json || {}) as Record<string, unknown>;
        const impressions = toNumber(metrics.impression_count);
        const engagement =
          toNumber(metrics.like_count) +
          toNumber(metrics.retweet_count) +
          toNumber(metrics.reply_count) +
          toNumber(metrics.quote_count) +
          toNumber(metrics.bookmark_count);
        return {
          id: item.id,
          title: item.title,
          channel: item.channel,
          variant_group: item.variant_group,
          variant_label: item.variant_label,
          impressions,
          engagement,
          clicks,
          conversions: conversionCount,
          conversionRate: clicks ? Math.round((conversionCount / clicks) * 1000) / 10 : 0,
        };
      }

      if (item.channel === "blog") {
        const impressions = pageViewsByItem[item.id] || 0;
        return {
          id: item.id,
          title: item.title,
          channel: item.channel,
          variant_group: item.variant_group,
          variant_label: item.variant_label,
          impressions,
          engagement: impressions,
          clicks,
          conversions: conversionCount,
          conversionRate: clicks ? Math.round((conversionCount / clicks) * 1000) / 10 : 0,
        };
      }

      if (item.channel === "email") {
        const sends = emailByItem[item.id] || [];
        const opens = sends.filter((send) => ["opened", "clicked"].includes(send.status)).length;
        const clickEngagement = sends.filter((send) => send.status === "clicked").length;
        return {
          id: item.id,
          title: item.title,
          channel: item.channel,
          variant_group: item.variant_group,
          variant_label: item.variant_label,
          impressions: 0,
          engagement: opens + clickEngagement,
          clicks,
          conversions: conversionCount,
          conversionRate: clicks ? Math.round((conversionCount / clicks) * 1000) / 10 : 0,
        };
      }

      return {
        id: item.id,
        title: item.title,
        channel: item.channel,
        variant_group: item.variant_group,
        variant_label: item.variant_label,
        impressions: 0,
        engagement: 0,
        clicks,
        conversions: conversionCount,
        conversionRate: clicks ? Math.round((conversionCount / clicks) * 1000) / 10 : 0,
      };
    })
    .filter((item) => item.impressions > 0 || item.engagement > 0 || item.clicks > 0 || item.conversions > 0);
}

export async function getLatestPatternSnapshot(
  siteId: string,
  supabase = getSupabaseAdminClient()
): Promise<ContentPatternSnapshot | null> {
  const { data } = await supabase
    .from("content_pattern_snapshots")
    .select("*")
    .eq("site_id", siteId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as ContentPatternSnapshot | null) ?? null;
}

export async function analyzeContentPatterns(
  siteId: string,
  supabase = getSupabaseAdminClient()
): Promise<ContentPatternSnapshot | null> {
  const since = subDays(new Date(), 90).toISOString();
  const metrics = await getPublishedMetrics(siteId, supabase, since);

  if (metrics.length < MIN_PATTERN_SAMPLE_SIZE) {
    return null;
  }

  const itemIds = metrics.map((item) => item.id);
  const { data: tags } = await supabase
    .from("content_tags")
    .select("*")
    .eq("site_id", siteId)
    .in("content_item_id", itemIds);

  const tagsByItem = ((tags || []) as ContentTag[]).reduce<Record<string, Record<string, string>>>((acc, tag) => {
    if (!acc[tag.content_item_id]) acc[tag.content_item_id] = {};
    acc[tag.content_item_id][tag.tag_category] = tag.tag_value;
    return acc;
  }, {});

  const taggedRows = metrics
    .filter((item) => tagsByItem[item.id] && Object.keys(tagsByItem[item.id]).length > 0)
    .map((item) => ({
      metrics: item,
      tags: tagsByItem[item.id],
    }));

  if (taggedRows.length < MIN_PATTERN_SAMPLE_SIZE) {
    return null;
  }

  const categories: ContentTagCategory[] = [
    "hook_type",
    "cta_type",
    "tone",
    "format",
    "topic_angle",
    "includes_price",
    "includes_social_proof",
    "content_length",
  ];

  const tagSummaries = categories.reduce<Partial<Record<ContentTagCategory, ContentPatternSummary>>>((acc, category) => {
    const grouped = new Map<string, ItemMetrics[]>();
    for (const row of taggedRows) {
      const value = row.tags[category];
      if (!value) continue;
      if (!grouped.has(value)) grouped.set(value, []);
      grouped.get(value)!.push(row.metrics);
    }
    if (grouped.size > 0) {
      acc[category] = summarizeCategory(category, grouped);
    }
    return acc;
  }, {});

  const combinations = buildCombination(taggedRows);
  const avgClickTotal = taggedRows.reduce((sum, row) => sum + row.metrics.clicks, 0);
  const avgConversionTotal = taggedRows.reduce((sum, row) => sum + row.metrics.conversions, 0);
  const averageConversionRate = avgClickTotal ? Math.round((avgConversionTotal / avgClickTotal) * 1000) / 10 : 0;

  const { data: exploreVariants } = await supabase
    .from("content_items")
    .select("id, title, channel, variant_group, variant_label, status")
    .eq("site_id", siteId)
    .eq("variant_label", "B_explore")
    .in("status", ["draft", "approved", "published"]);

  const variantRows = metrics.filter((item) => item.variant_group);
  const variantsByGroup = variantRows.reduce<Record<string, ItemMetrics[]>>((acc, item) => {
    if (!item.variant_group) return acc;
    if (!acc[item.variant_group]) acc[item.variant_group] = [];
    acc[item.variant_group].push(item);
    return acc;
  }, {});

  const recentExploreWins = Object.entries(variantsByGroup)
    .flatMap(([variantGroup, rows]) => {
      const explore = rows.find((row) => row.variant_label === "B_explore");
      const exploit = rows.find((row) => row.variant_label === "A_exploit");
      if (!explore || !exploit) return [];
      if (explore.conversionRate <= exploit.conversionRate || explore.clicks === 0) return [];
      return [{
        variant_group: variantGroup,
        winner_content_item_id: explore.id,
        winner_title: explore.title,
        channel: explore.channel,
        conversion_rate: explore.conversionRate,
      }];
    })
    .slice(0, 5);

  const snapshotBase: ContentPatternSnapshotData = {
    generated_at: new Date().toISOString(),
    period_start: since,
    period_end: new Date().toISOString(),
    sample_size: taggedRows.length,
    average_conversion_rate: averageConversionRate,
    tag_summaries: tagSummaries,
    top_pattern: combinations[0] || null,
    patterns_to_avoid: combinations.slice(-3).reverse(),
    explore_variants_in_flight: ((exploreVariants || []) as Array<Pick<ContentItem, "id" | "title" | "channel" | "variant_group">>)
      .filter((item) => item.variant_group)
      .map((item) => ({
        content_item_id: item.id,
        title: item.title,
        channel: item.channel,
        variant_group: item.variant_group!,
      }))
      .slice(0, 6),
    recent_explore_wins: recentExploreWins,
    lessons_learned: "",
  };

  snapshotBase.lessons_learned = await buildLessonsLearned(snapshotBase);

  const { data } = await supabase
    .from("content_pattern_snapshots")
    .insert({
      site_id: siteId,
      snapshot_json: snapshotBase,
      sample_size: taggedRows.length,
      period_start: since,
      period_end: snapshotBase.period_end,
    })
    .select("*")
    .single();

  return (data as ContentPatternSnapshot | null) ?? null;
}

export function buildContentIntelligencePrompt(snapshot: ContentPatternSnapshot | null) {
  const data = snapshot?.snapshot_json;
  if (!snapshot || !data || snapshot.sample_size < MIN_PATTERN_SAMPLE_SIZE) {
    return null;
  }

  const hook = data.tag_summaries.hook_type?.best;
  const cta = data.tag_summaries.cta_type?.best;
  const tone = data.tag_summaries.tone?.best;
  const format = data.tag_summaries.format?.best;
  const worstHook = data.tag_summaries.hook_type?.worst;
  const worstCta = data.tag_summaries.cta_type?.worst;
  const avoid = data.patterns_to_avoid[0];

  return `## Content Intelligence (learned from your past ${data.sample_size} published pieces)

### What converts best for this audience
- Hook type: ${hook?.tag_value || "pain_point"} (${hook?.conversion_rate || 0}% conversion rate vs ${data.average_conversion_rate}% average)
- CTA style: ${cta?.tag_value || "direct_signup"} (${cta?.conversion_rate || 0}% conversion rate)
- Tone: ${tone?.tag_value || "authoritative"}
- Format: ${format?.tag_value || "short_text"}

### Top performing content pattern
${data.top_pattern ? `${data.top_pattern.label} — ${data.top_pattern.conversion_rate}% CVR across ${data.top_pattern.sample_size} pieces` : "No dominant pattern yet"}

### Patterns to avoid
- ${worstHook ? `${worstHook.tag_value} hooks underperform at ${worstHook.conversion_rate}% CVR` : "No weak hook pattern yet"}
- ${worstCta ? `${worstCta.tag_value} CTAs underperform at ${worstCta.conversion_rate}% CVR` : "No weak CTA pattern yet"}
- ${avoid ? `${avoid.label} consistently underperforms` : "No weak combination captured yet"}

### Instruction
Use the top-performing patterns as your primary approach. For roughly 80% of content, lean into what is already converting. For the remaining 20%, test a meaningfully different hook or tone so LaunchPilot can keep discovering new winners. ${cta?.tag_value ? `Bias toward ${cta.tag_value} CTAs.` : ""}`;
}

export function buildContentPatternSummary(snapshot: ContentPatternSnapshot | null) {
  const data = snapshot?.snapshot_json;
  if (!snapshot || !data || snapshot.sample_size < MIN_PATTERN_SAMPLE_SIZE) {
    return "";
  }

  const hook = data.tag_summaries.hook_type?.best;
  const cta = data.tag_summaries.cta_type?.best;
  const tone = data.tag_summaries.tone?.best;

  return `Content Pattern Intelligence

Based on ${data.sample_size} published pieces:
- Best converting hook type: ${hook?.tag_value || "unknown"} at ${hook?.conversion_rate || 0}%
- Best converting CTA: ${cta?.tag_value || "unknown"} at ${cta?.conversion_rate || 0}%
- Best converting tone: ${tone?.tag_value || "unknown"}
- Current explore variants testing: ${data.explore_variants_in_flight.length > 0 ? data.explore_variants_in_flight.map((item) => `${item.title} (${item.channel})`).join("; ") : "None"}
- Recent explore wins: ${data.recent_explore_wins.length > 0 ? data.recent_explore_wins.map((item) => `${item.winner_title} (${item.channel})`).join("; ") : "None"}

Lessons learned:
${data.lessons_learned}`;
}
