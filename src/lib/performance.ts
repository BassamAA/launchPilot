import { format, subDays } from "date-fns";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { recordGrowthSignal } from "@/lib/growth";
import {
  ContentChannel,
  ContentItem,
  ContentPatternSnapshot,
  ContentPerformance,
  Conversion,
  EmailSend,
  GrowthExperiment,
  GrowthSignal,
  LinkClick,
  PageView,
  ProductEvent,
  TrackedLink,
} from "@/types";

type SupabaseAdmin = ReturnType<typeof getSupabaseAdminClient>;

type PerformanceMetricName =
  | "twitter_impressions"
  | "twitter_likes"
  | "twitter_retweets"
  | "twitter_replies"
  | "twitter_quotes"
  | "twitter_bookmarks"
  | "blog_page_views"
  | "blog_unique_visitors"
  | "email_sent"
  | "email_delivered"
  | "email_opened"
  | "email_clicked"
  | "email_bounced";

interface LatestTwitterMetrics {
  tweetId: string | null;
  impressions: number;
  likes: number;
  retweets: number;
  replies: number;
  quotes: number;
  bookmarks: number;
}

export interface PerformanceContentRow {
  id: string;
  title: string;
  channel: ContentChannel;
  publishedUrl: string | null;
  publishedDate: string | null;
  impressions: number;
  engagement: number;
  metrics: Record<string, number>;
  clicks?: number;
  conversions?: number;
  conversionRate?: number;
  onboardingComplete?: number;
  activated?: number;
  revenueEvents?: number;
  revenueValue?: number;
  uniqueVisitors?: number;
  topReferrers?: Array<{ referrer: string; count: number }>;
}

export interface SitePerformanceResponse {
  overview: {
    totalImpressions: number;
    totalEngagement: number;
    contentPublished: number;
    totalClicks: number;
    totalConversions: number;
    totalActivated: number;
    totalRevenueValue: number;
    bestPerformingPiece: PerformanceContentRow | null;
  };
  channelBreakdown: Array<{
    channel: ContentChannel;
    impressions: number;
    engagement: number;
    published: number;
    clicks: number;
    conversions: number;
    conversionRate: number;
    onboardingComplete: number;
    activated: number;
    revenueEvents: number;
    revenueValue: number;
  }>;
  attribution: {
    totalClicks: number;
    totalConversions: number;
    totalActivated: number;
    totalRevenueValue: number;
    overallConversionRate: number;
    topConvertingContent: PerformanceContentRow[];
    trackingInstalled: boolean;
    lastConversionAt: string | null;
  };
  funnel: {
    totalClicks: number;
    totalSignups: number;
    totalOnboardingComplete: number;
    totalActivated: number;
    totalRevenueEvents: number;
    totalRevenueValue: number;
  };
  contentIntelligence: ContentPatternSnapshot["snapshot_json"] | null;
  impressionsOverTime: Array<{
    date: string;
    twitter_impressions: number;
    blog_page_views: number;
    total_impressions: number;
    clicks: number;
    conversions: number;
    onboarding_complete: number;
    activated: number;
    subscribed: number;
  }>;
  topContent: PerformanceContentRow[];
  experiments: GrowthExperiment[];
  recentSignals: GrowthSignal[];
}

function toNumber(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function extractTweetId(publishedUrl: string | null | undefined) {
  if (!publishedUrl) return null;
  const match = publishedUrl.match(/status\/(\d+)/);
  return match?.[1] || null;
}

function getMetricDay(dateValue: string) {
  return format(new Date(dateValue), "yyyy-MM-dd");
}

function getLatestRowsByContentItem(rows: ContentPerformance[]) {
  const latest = new Map<string, ContentPerformance>();

  for (const row of rows) {
    const existing = latest.get(row.content_item_id);
    if (!existing || new Date(row.fetched_at) > new Date(existing.fetched_at)) {
      latest.set(row.content_item_id, row);
    }
  }

  return latest;
}

function parseTwitterMetrics(row: ContentPerformance | null | undefined): LatestTwitterMetrics {
  const metrics = (row?.metrics_json || {}) as Record<string, unknown>;
  return {
    tweetId: typeof metrics.tweet_id === "string" ? metrics.tweet_id : null,
    impressions: toNumber(metrics.impression_count),
    likes: toNumber(metrics.like_count),
    retweets: toNumber(metrics.retweet_count),
    replies: toNumber(metrics.reply_count),
    quotes: toNumber(metrics.quote_count),
    bookmarks: toNumber(metrics.bookmark_count),
  };
}

async function resolveExperimentIdForContent(
  siteId: string,
  channel: ContentChannel,
  contentItemId: string,
  supabase: SupabaseAdmin
) {
  const { data: contentItem } = await supabase
    .from("content_items")
    .select("metadata_json")
    .eq("id", contentItemId)
    .maybeSingle();

  const directExperimentId = (contentItem?.metadata_json as Record<string, unknown> | null)?.experiment_id;
  if (typeof directExperimentId === "string" && directExperimentId) {
    return directExperimentId;
  }

  const { data: experiment } = await supabase
    .from("growth_experiments")
    .select("id")
    .eq("site_id", siteId)
    .eq("status", "active")
    .eq("target_channel", channel)
    .order("confidence", { ascending: false })
    .limit(1)
    .maybeSingle();

  return experiment?.id || null;
}

export async function getLatestContentPerformanceSnapshot(
  contentItemId: string,
  supabase = getSupabaseAdminClient()
) {
  const { data } = await supabase
    .from("content_performance")
    .select("*")
    .eq("content_item_id", contentItemId)
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as ContentPerformance | null) ?? null;
}

export async function recordBlogViewSignals(
  siteId: string,
  supabase = getSupabaseAdminClient()
) {
  const windowStart = subDays(new Date(), 1).toISOString();
  const [{ data: pageViews }, { data: blogItems }] = await Promise.all([
    supabase
      .from("page_views")
      .select("content_item_id, site_id, referrer, visitor_hash, viewed_at")
      .eq("site_id", siteId)
      .gte("viewed_at", windowStart),
    supabase
      .from("content_items")
      .select("id, channel")
      .eq("site_id", siteId)
      .eq("channel", "blog"),
  ]);

  const blogItemIds = new Set((blogItems || []).map((item) => item.id));
  const grouped = new Map<string, { views: number; visitors: Set<string> }>();

  for (const view of (pageViews || []) as Array<Pick<PageView, "content_item_id" | "visitor_hash">>) {
    if (!blogItemIds.has(view.content_item_id)) continue;
    if (!grouped.has(view.content_item_id)) {
      grouped.set(view.content_item_id, { views: 0, visitors: new Set<string>() });
    }
    const bucket = grouped.get(view.content_item_id)!;
    bucket.views += 1;
    bucket.visitors.add(view.visitor_hash);
  }

  let newSignals = 0;
  let trackedPosts = 0;

  for (const [contentItemId, stats] of grouped.entries()) {
    trackedPosts += 1;
    const experimentId = await resolveExperimentIdForContent(siteId, "blog", contentItemId, supabase);

    const { data: latestSignal } = await supabase
      .from("growth_signals")
      .select("metric_name, metric_value, metadata_json, occurred_at")
      .eq("content_item_id", contentItemId)
      .eq("source", "page_view_aggregate")
      .in("metric_name", ["blog_page_views", "blog_unique_visitors"])
      .order("occurred_at", { ascending: false })
      .limit(2);

    const latestMap = new Map(
      (latestSignal || []).map((signal) => [signal.metric_name as string, toNumber(signal.metric_value)])
    );

    const nextMetrics: Array<{ metricName: PerformanceMetricName; metricValue: number }> = [
      { metricName: "blog_page_views", metricValue: stats.views },
      { metricName: "blog_unique_visitors", metricValue: stats.visitors.size },
    ];

    for (const metric of nextMetrics) {
      if (latestMap.get(metric.metricName) === metric.metricValue) continue;

      await recordGrowthSignal(
        {
          siteId,
          contentItemId,
          experimentId,
          channel: "blog",
          signalType: "performance",
          metricName: metric.metricName,
          metricValue: metric.metricValue,
          source: "page_view_aggregate",
          metadata: {
            window: "24h",
            window_start: windowStart,
          },
        },
        supabase
      );
      newSignals += 1;
    }
  }

  return { trackedPosts, newSignals };
}

export async function getSitePerformanceData(
  siteId: string,
  supabase = getSupabaseAdminClient()
): Promise<SitePerformanceResponse> {
  const since = subDays(new Date(), 30).toISOString();

  const [
    { data: contentItems },
    { data: performanceRows },
    { data: pageViews },
    { data: emailSends },
    { data: trackedLinks },
    { data: linkClicks },
    { data: conversions },
    { data: productEvents },
    { data: siteRow },
    { data: patternSnapshot },
    { data: experiments },
    { data: recentSignals },
  ] = await Promise.all([
    supabase
      .from("content_items")
      .select("id, title, channel, status, published_url, published_date")
      .eq("site_id", siteId)
      .eq("status", "published"),
    supabase
      .from("content_performance")
      .select("*")
      .eq("site_id", siteId)
      .gte("fetched_at", since)
      .order("fetched_at", { ascending: false }),
    supabase
      .from("page_views")
      .select("*")
      .eq("site_id", siteId)
      .gte("viewed_at", since),
    supabase
      .from("email_sends")
      .select("*")
      .eq("site_id", siteId)
      .gte("created_at", since),
    supabase
      .from("tracked_links")
      .select("*")
      .eq("site_id", siteId),
    supabase
      .from("link_clicks")
      .select("*")
      .eq("site_id", siteId)
      .gte("clicked_at", since),
    supabase
      .from("conversions")
      .select("*")
      .eq("site_id", siteId)
      .gte("converted_at", since),
    supabase
      .from("product_events")
      .select("*")
      .eq("site_id", siteId)
      .gte("occurred_at", since),
    supabase
      .from("sites")
      .select("public_tracking_key")
      .eq("id", siteId)
      .maybeSingle(),
    supabase
      .from("content_pattern_snapshots")
      .select("*")
      .eq("site_id", siteId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
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

  const items = (contentItems || []) as Array<
    Pick<ContentItem, "id" | "title" | "channel" | "published_url" | "published_date">
  >;
  const performance = (performanceRows || []) as ContentPerformance[];
  const views = (pageViews || []) as PageView[];
  const sends = (emailSends || []) as EmailSend[];
  const trackedLinkRows = (trackedLinks || []) as TrackedLink[];
  const clickRows = (linkClicks || []) as LinkClick[];
  const conversionRows = (conversions || []) as Conversion[];
  const productEventRows = (productEvents || []) as ProductEvent[];

  const latestPerformanceByItem = getLatestRowsByContentItem(performance);
  const pageViewsByItem = views.reduce<
    Record<string, { views: number; visitors: Set<string>; referrers: Record<string, number> }>
  >((acc, view) => {
    if (!acc[view.content_item_id]) {
      acc[view.content_item_id] = { views: 0, visitors: new Set<string>(), referrers: {} };
    }
    acc[view.content_item_id].views += 1;
    acc[view.content_item_id].visitors.add(view.visitor_hash);
    const referrer = view.referrer || "Direct / Unknown";
    acc[view.content_item_id].referrers[referrer] = (acc[view.content_item_id].referrers[referrer] || 0) + 1;
    return acc;
  }, {});

  const sendsByItem = sends.reduce<Record<string, EmailSend[]>>((acc, send) => {
    if (!acc[send.content_item_id]) acc[send.content_item_id] = [];
    acc[send.content_item_id].push(send);
    return acc;
  }, {});

  const trackedLinkByItem = trackedLinkRows.reduce<Record<string, TrackedLink>>((acc, link) => {
    if (link.content_item_id) {
      acc[link.content_item_id] = link;
    }
    return acc;
  }, {});

  const clicksByLinkId = clickRows.reduce<Record<string, number>>((acc, click) => {
    acc[click.tracked_link_id] = (acc[click.tracked_link_id] || 0) + 1;
    return acc;
  }, {});

  const conversionsByLinkId = conversionRows.reduce<Record<string, number>>((acc, conversion) => {
    if (conversion.tracked_link_id) {
      acc[conversion.tracked_link_id] = (acc[conversion.tracked_link_id] || 0) + 1;
    }
    return acc;
  }, {});

  const conversionsByItemId = conversionRows.reduce<Record<string, number>>((acc, conversion) => {
    if (conversion.content_item_id) {
      acc[conversion.content_item_id] = (acc[conversion.content_item_id] || 0) + 1;
    }
    return acc;
  }, {});

  const productEventsByLinkId = productEventRows.reduce<Record<string, ProductEvent[]>>((acc, event) => {
    if (event.tracked_link_id) {
      if (!acc[event.tracked_link_id]) acc[event.tracked_link_id] = [];
      acc[event.tracked_link_id].push(event);
    }
    return acc;
  }, {});

  const productEventsByItemId = productEventRows.reduce<Record<string, ProductEvent[]>>((acc, event) => {
    if (event.content_item_id) {
      if (!acc[event.content_item_id]) acc[event.content_item_id] = [];
      acc[event.content_item_id].push(event);
    }
    return acc;
  }, {});

  const topContent: PerformanceContentRow[] = items.map((item) => {
    const trackedLink = trackedLinkByItem[item.id];
    const clicks = trackedLink ? clicksByLinkId[trackedLink.id] || trackedLink.click_count || 0 : 0;
    const conversions = trackedLink ? conversionsByLinkId[trackedLink.id] || 0 : conversionsByItemId[item.id] || 0;
    const conversionRate = clicks ? Math.round((conversions / clicks) * 100) : 0;
    const relatedProductEvents =
      (trackedLink ? productEventsByLinkId[trackedLink.id] : null) ||
      productEventsByItemId[item.id] ||
      [];
    const onboardingComplete = relatedProductEvents.filter((event) => event.event_type === "onboarding_complete").length;
    const activated = relatedProductEvents.filter((event) => event.event_type === "activated").length;
    const revenueEvents = relatedProductEvents.filter((event) => event.event_type === "subscribed").length;
    const revenueValue = relatedProductEvents
      .filter((event) => event.event_type === "subscribed")
      .reduce((sum, event) => sum + toNumber(event.event_value), 0);

    if (item.channel === "twitter") {
      const metrics = parseTwitterMetrics(latestPerformanceByItem.get(item.id));
      const engagement = metrics.likes + metrics.retweets + metrics.replies + metrics.quotes + metrics.bookmarks;
      const metricMap: Record<string, number> = {
        twitter_impressions: metrics.impressions,
        twitter_likes: metrics.likes,
        twitter_retweets: metrics.retweets,
        twitter_replies: metrics.replies,
        twitter_quotes: metrics.quotes,
        twitter_bookmarks: metrics.bookmarks,
      };
      return {
        id: item.id,
        title: item.title,
        channel: item.channel,
        publishedUrl: item.published_url,
        publishedDate: item.published_date,
        impressions: metrics.impressions,
        engagement,
        metrics: metricMap,
        clicks,
        conversions,
        conversionRate,
        onboardingComplete,
        activated,
        revenueEvents,
        revenueValue,
      };
    }

    if (item.channel === "blog") {
      const pageStats = pageViewsByItem[item.id] || {
        views: 0,
        visitors: new Set<string>(),
        referrers: {},
      };
      const metricMap: Record<string, number> = {
        blog_page_views: pageStats.views,
        blog_unique_visitors: pageStats.visitors.size,
      };
      return {
        id: item.id,
        title: item.title,
        channel: item.channel,
        publishedUrl: item.published_url,
        publishedDate: item.published_date,
        impressions: pageStats.views,
        engagement: pageStats.views,
        metrics: metricMap,
        clicks,
        conversions,
        conversionRate,
        onboardingComplete,
        activated,
        revenueEvents,
        revenueValue,
        uniqueVisitors: pageStats.visitors.size,
        topReferrers: Object.entries(pageStats.referrers)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([referrer, count]) => ({ referrer, count })),
      };
    }

    if (item.channel === "email") {
      const itemSends = sendsByItem[item.id] || [];
      const sent = itemSends.filter((send) => ["sent", "delivered", "opened", "clicked"].includes(send.status)).length;
      const delivered = itemSends.filter((send) => ["delivered", "opened", "clicked"].includes(send.status)).length;
      const opened = itemSends.filter((send) => ["opened", "clicked"].includes(send.status)).length;
      const clicked = itemSends.filter((send) => send.status === "clicked").length;
      const bounced = itemSends.filter((send) => send.status === "bounced").length;
      const openRate = delivered ? Math.round((opened / delivered) * 100) : 0;
      const clickRate = delivered ? Math.round((clicked / delivered) * 100) : 0;
      const metricMap: Record<string, number> = {
        email_sent: sent,
        email_delivered: delivered,
        email_opened: opened,
        email_clicked: clicked,
        email_bounced: bounced,
        email_open_rate: openRate,
        email_click_rate: clickRate,
      };
      return {
        id: item.id,
        title: item.title,
        channel: item.channel,
        publishedUrl: item.published_url,
        publishedDate: item.published_date,
        impressions: 0,
        engagement: opened + clicked,
        metrics: metricMap,
        clicks,
        conversions,
        conversionRate,
        onboardingComplete,
        activated,
        revenueEvents,
        revenueValue,
      };
    }

    return {
      id: item.id,
      title: item.title,
      channel: item.channel,
      publishedUrl: item.published_url,
      publishedDate: item.published_date,
      impressions: 0,
      engagement: 0,
      metrics: {},
      clicks,
      conversions,
      conversionRate,
      onboardingComplete,
      activated,
      revenueEvents,
      revenueValue,
    };
  });

  const overview = {
    totalImpressions: topContent.reduce((sum, item) => sum + item.impressions, 0),
    totalEngagement: topContent.reduce((sum, item) => sum + item.engagement, 0),
    contentPublished: items.length,
    totalClicks: topContent.reduce((sum, item) => sum + (item.clicks || 0), 0),
    totalConversions: topContent.reduce((sum, item) => sum + (item.conversions || 0), 0),
    totalActivated: topContent.reduce((sum, item) => sum + (item.activated || 0), 0),
    totalRevenueValue: topContent.reduce((sum, item) => sum + (item.revenueValue || 0), 0),
    bestPerformingPiece:
      [...topContent].sort(
        (a, b) =>
          (b.revenueValue || 0) - (a.revenueValue || 0) ||
          (b.activated || 0) - (a.activated || 0) ||
          (b.conversions || 0) - (a.conversions || 0) ||
          b.engagement - a.engagement ||
          b.impressions - a.impressions
      )[0] || null,
  };

  const channelBreakdown = (["twitter", "blog", "email", "reddit", "directory", "tiktok"] as ContentChannel[]).map(
    (channel) => {
      const channelItems = topContent.filter((item) => item.channel === channel);
      return {
        channel,
        impressions: channelItems.reduce((sum, item) => sum + item.impressions, 0),
        engagement: channelItems.reduce((sum, item) => sum + item.engagement, 0),
        published: channelItems.length,
        clicks: channelItems.reduce((sum, item) => sum + (item.clicks || 0), 0),
        conversions: channelItems.reduce((sum, item) => sum + (item.conversions || 0), 0),
        conversionRate: (() => {
          const clicks = channelItems.reduce((sum, item) => sum + (item.clicks || 0), 0);
          const conversions = channelItems.reduce((sum, item) => sum + (item.conversions || 0), 0);
          return clicks ? Math.round((conversions / clicks) * 100) : 0;
        })(),
        onboardingComplete: channelItems.reduce((sum, item) => sum + (item.onboardingComplete || 0), 0),
        activated: channelItems.reduce((sum, item) => sum + (item.activated || 0), 0),
        revenueEvents: channelItems.reduce((sum, item) => sum + (item.revenueEvents || 0), 0),
        revenueValue: channelItems.reduce((sum, item) => sum + (item.revenueValue || 0), 0),
      };
    }
  );

  const dailyTwitter = performance.reduce<Record<string, number>>((acc, row) => {
    if (row.channel !== "twitter") return acc;
    const day = getMetricDay(row.fetched_at);
    const impressions = toNumber((row.metrics_json as Record<string, unknown>).impression_count);
    acc[`${day}:${row.content_item_id}`] = Math.max(acc[`${day}:${row.content_item_id}`] || 0, impressions);
    return acc;
  }, {});

  const dailyTwitterSummed = Object.entries(dailyTwitter).reduce<Record<string, number>>((acc, [key, value]) => {
    const [day] = key.split(":");
    acc[day] = (acc[day] || 0) + value;
    return acc;
  }, {});

  const dailyBlogViews = views.reduce<Record<string, number>>((acc, view) => {
    const day = getMetricDay(view.viewed_at);
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {});

  const dailyClicks = clickRows.reduce<Record<string, number>>((acc, click) => {
    const day = getMetricDay(click.clicked_at);
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {});

  const dailyConversions = conversionRows.reduce<Record<string, number>>((acc, conversion) => {
    const day = getMetricDay(conversion.converted_at);
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {});

  const dailyProductEvents = productEventRows.reduce<
    Record<string, { onboarding_complete: number; activated: number; subscribed: number }>
  >((acc, event) => {
    const day = getMetricDay(event.occurred_at);
    if (!acc[day]) {
      acc[day] = { onboarding_complete: 0, activated: 0, subscribed: 0 };
    }
    if (event.event_type === "onboarding_complete") acc[day].onboarding_complete += 1;
    if (event.event_type === "activated") acc[day].activated += 1;
    if (event.event_type === "subscribed") acc[day].subscribed += 1;
    return acc;
  }, {});

  const impressionsOverTime = Array.from({ length: 30 }, (_, index) => {
    const day = format(subDays(new Date(), 29 - index), "yyyy-MM-dd");
    const twitterImpressions = dailyTwitterSummed[day] || 0;
    const blogPageViews = dailyBlogViews[day] || 0;
    return {
      date: day,
      twitter_impressions: twitterImpressions,
      blog_page_views: blogPageViews,
      total_impressions: twitterImpressions + blogPageViews,
      clicks: dailyClicks[day] || 0,
      conversions: dailyConversions[day] || 0,
      onboarding_complete: dailyProductEvents[day]?.onboarding_complete || 0,
      activated: dailyProductEvents[day]?.activated || 0,
      subscribed: dailyProductEvents[day]?.subscribed || 0,
    };
  });

  const totalClicks = topContent.reduce((sum, item) => sum + (item.clicks || 0), 0);
  const totalConversions = topContent.reduce((sum, item) => sum + (item.conversions || 0), 0);
  const totalOnboardingComplete = topContent.reduce((sum, item) => sum + (item.onboardingComplete || 0), 0);
  const totalActivated = topContent.reduce((sum, item) => sum + (item.activated || 0), 0);
  const totalRevenueEvents = topContent.reduce((sum, item) => sum + (item.revenueEvents || 0), 0);
  const totalRevenueValue = topContent.reduce((sum, item) => sum + (item.revenueValue || 0), 0);

  return {
    overview,
    channelBreakdown,
    attribution: {
      totalClicks,
      totalConversions,
      totalActivated,
      totalRevenueValue,
      overallConversionRate: totalClicks ? Math.round((totalConversions / totalClicks) * 100) : 0,
      topConvertingContent: [...topContent]
        .filter((item) => (item.conversions || 0) > 0 || (item.clicks || 0) > 0 || (item.activated || 0) > 0)
        .sort(
          (a, b) =>
            (b.revenueValue || 0) - (a.revenueValue || 0) ||
            (b.activated || 0) - (a.activated || 0) ||
            (b.conversions || 0) - (a.conversions || 0) ||
            (b.clicks || 0) - (a.clicks || 0)
        )
        .slice(0, 10),
      trackingInstalled: !!siteRow?.public_tracking_key,
      lastConversionAt:
        conversionRows.length > 0
          ? [...conversionRows].sort(
              (a, b) => new Date(b.converted_at).getTime() - new Date(a.converted_at).getTime()
            )[0]?.converted_at || null
          : null,
    },
    funnel: {
      totalClicks,
      totalSignups: totalConversions,
      totalOnboardingComplete,
      totalActivated,
      totalRevenueEvents,
      totalRevenueValue,
    },
    contentIntelligence: ((patternSnapshot as ContentPatternSnapshot | null)?.snapshot_json || null) as ContentPatternSnapshot["snapshot_json"] | null,
    impressionsOverTime,
    topContent: [...topContent]
      .sort(
        (a, b) =>
          (b.revenueValue || 0) - (a.revenueValue || 0) ||
          (b.activated || 0) - (a.activated || 0) ||
          (b.conversions || 0) - (a.conversions || 0) ||
          b.engagement - a.engagement ||
          b.impressions - a.impressions
      )
      .slice(0, 10),
    experiments: (experiments || []) as GrowthExperiment[],
    recentSignals: (recentSignals || []) as GrowthSignal[],
  };
}

export async function buildPlanPerformanceSummary(
  siteId: string,
  supabase = getSupabaseAdminClient()
) {
  const since = subDays(new Date(), 30).toISOString();

  const [
    performanceData,
    { data: activeExperiments },
    { data: signals },
    { data: contentItems },
  ] = await Promise.all([
    getSitePerformanceData(siteId, supabase),
    supabase
      .from("growth_experiments")
      .select("*")
      .eq("site_id", siteId)
      .order("confidence", { ascending: false })
      .limit(8),
    supabase
      .from("growth_signals")
      .select("*")
      .eq("site_id", siteId)
      .gte("occurred_at", since),
    supabase
      .from("content_items")
      .select("channel, status")
      .eq("site_id", siteId),
  ]);

  const channelSignalSummary = ((signals || []) as GrowthSignal[]).reduce<Record<string, number>>((acc, signal) => {
    const channel = signal.channel || "unknown";
    acc[channel] = (acc[channel] || 0) + 1;
    return acc;
  }, {});

  const completionStats = ((contentItems || []) as Array<Pick<ContentItem, "channel" | "status">>).reduce<
    Record<string, { approved: number; rejected: number; published: number }>
  >((acc, item) => {
    if (!acc[item.channel]) {
      acc[item.channel] = { approved: 0, rejected: 0, published: 0 };
    }
    if (item.status === "approved") acc[item.channel].approved += 1;
    if (item.status === "rejected") acc[item.channel].rejected += 1;
    if (item.status === "published") acc[item.channel].published += 1;
    return acc;
  }, {});

  const twitterAggregate = performanceData.channelBreakdown.find((entry) => entry.channel === "twitter");
  const blogAggregate = performanceData.channelBreakdown.find((entry) => entry.channel === "blog");
  const emailAggregate = performanceData.channelBreakdown.find((entry) => entry.channel === "email");
  const redditAggregate = performanceData.channelBreakdown.find((entry) => entry.channel === "reddit");
  const directoryAggregate = performanceData.channelBreakdown.find((entry) => entry.channel === "directory");
  const emailTop = performanceData.topContent.filter((item) => item.channel === "email");
  const emailSent = emailTop.reduce((sum, item) => sum + (item.metrics.email_sent || 0), 0);
  const emailOpened = emailTop.reduce((sum, item) => sum + (item.metrics.email_opened || 0), 0);
  const emailClicked = emailTop.reduce((sum, item) => sum + (item.metrics.email_clicked || 0), 0);
  const openRate = emailSent ? Math.round((emailOpened / emailSent) * 100) : 0;
  const clickRate = emailSent ? Math.round((emailClicked / emailSent) * 100) : 0;
  const redditCompleted = completionStats.reddit?.published || 0;
  const directoriesSubmitted = completionStats.directory?.published || 0;
  const topBlog = performanceData.topContent.find((item) => item.channel === "blog");

  const topPerformers = performanceData.topContent
    .slice(0, 5)
    .map((item) => {
      const clicks = item.clicks || 0;
      const conversions = item.conversions || 0;
      return `- ${item.channel}: "${item.title}" — ${conversions} conversions, ${clicks} clicks, ${item.engagement} engagement, ${item.impressions} impressions`;
    })
    .join("\n");

  const underperformers = performanceData.channelBreakdown
    .filter(
      (entry) =>
        entry.published > 0 &&
        entry.conversions === 0 &&
        entry.clicks < 5 &&
        entry.engagement <= Math.max(1, entry.published)
    )
    .map(
      (entry) =>
        `- ${entry.channel}: ${entry.published} published items, ${entry.clicks} clicks, ${entry.conversions} conversions, ${entry.engagement} engagement`
    )
    .join("\n");

  const conversionLines = performanceData.channelBreakdown
    .filter((entry) => entry.published > 0 || entry.clicks > 0 || entry.conversions > 0)
    .map(
      (entry) =>
        `- ${entry.channel}: ${entry.clicks} clicks -> ${entry.conversions} conversions (${entry.conversionRate}% CVR) across ${entry.published} published items`
    )
    .join("\n");

  const topConverting = performanceData.attribution.topConvertingContent
    .slice(0, 5)
    .map(
      (item) =>
        `- "${item.title}" (${item.channel}) — ${item.conversions || 0} conversions from ${item.clicks || 0} clicks (${item.conversionRate || 0}% CVR)`
    )
    .join("\n");

  const experimentSummary = ((activeExperiments || []) as GrowthExperiment[])
    .map((experiment) => `- [${experiment.status}] ${experiment.hypothesis} (${experiment.confidence}% confidence)`)
    .join("\n");

  const channelSignalLines = Object.entries(channelSignalSummary)
    .sort(([, a], [, b]) => b - a)
    .map(([channel, count]) => `- ${channel}: ${count} signals`)
    .join("\n");

  const summary = `Performance Data from Previous Period

Channel Performance (last 30 days)
Twitter: ${twitterAggregate?.impressions || 0} impressions, ${twitterAggregate?.engagement || 0} total engagement, ${twitterAggregate?.clicks || 0} clicks, ${twitterAggregate?.conversions || 0} conversions across ${twitterAggregate?.published || 0} tweets.
Blog: ${blogAggregate?.impressions || 0} page views, ${blogAggregate?.clicks || 0} clicks, ${blogAggregate?.conversions || 0} conversions across ${blogAggregate?.published || 0} posts.${topBlog ? ` Top post: "${topBlog.title}" with ${topBlog.impressions} views.` : ""}
Email: ${emailSent} sent, ${openRate}% open rate, ${clickRate}% click rate, ${emailAggregate?.clicks || 0} clicks, ${emailAggregate?.conversions || 0} conversions.
Reddit: ${redditCompleted} posts marked as completed, ${redditAggregate?.clicks || 0} clicks, ${redditAggregate?.conversions || 0} conversions.
Directories: ${directoriesSubmitted} submitted, ${directoryAggregate?.clicks || 0} clicks, ${directoryAggregate?.conversions || 0} conversions.

Attribution Summary (last 30 days)
${conversionLines || "- No clicks or conversions tracked yet"}

Activation and Revenue Outcomes
- Signups: ${performanceData.funnel.totalSignups}
- Onboarding complete: ${performanceData.funnel.totalOnboardingComplete}
- Activated: ${performanceData.funnel.totalActivated}
- Revenue events: ${performanceData.funnel.totalRevenueEvents}
- Revenue value: ${performanceData.funnel.totalRevenueValue}

Growth Experiments Status
${experimentSummary || "- No experiments yet"}

Recent Signal Volume By Channel
${channelSignalLines || "- No signal data yet"}

Top Performing Content
${topPerformers || "- No high-performing content captured yet"}

Top Converting Content
${topConverting || "- No converting content captured yet"}

Underperforming Areas
${underperformers || "- No clearly underperforming areas yet; keep testing and watch for weak channels."}

Completion Rate By Channel
${Object.entries(completionStats)
  .map(
    ([channel, stats]) =>
      `- ${channel}: ${stats.published} published, ${stats.approved} approved, ${stats.rejected} rejected`
  )
  .join("\n") || "- No completion data yet"}`;

  return {
    summary,
    performanceData,
  };
}

export { extractTweetId, resolveExperimentIdForContent };
