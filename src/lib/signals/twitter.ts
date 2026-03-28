import { recordGrowthSignal } from "@/lib/growth";
import { getLatestContentPerformanceSnapshot, extractTweetId, resolveExperimentIdForContent } from "@/lib/performance";
import { refreshTwitterConnectionToken } from "@/lib/publishing";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { PlatformConnection } from "@/types";

type SupabaseAdmin = ReturnType<typeof getSupabaseAdminClient>;

interface TwitterFetchResult {
  tweetsChecked: number;
  snapshotsStored: number;
  newSignals: number;
}

const METRIC_MAP = [
  { apiKey: "impression_count", signalName: "twitter_impressions" },
  { apiKey: "like_count", signalName: "twitter_likes" },
  { apiKey: "retweet_count", signalName: "twitter_retweets" },
  { apiKey: "reply_count", signalName: "twitter_replies" },
  { apiKey: "quote_count", signalName: "twitter_quotes" },
  { apiKey: "bookmark_count", signalName: "twitter_bookmarks" },
] as const;

async function getTwitterConnection(siteId: string, supabase: SupabaseAdmin) {
  const { data } = await supabase
    .from("platform_connections")
    .select("*")
    .eq("site_id", siteId)
    .eq("platform", "twitter")
    .maybeSingle();

  return (data as PlatformConnection | null) ?? null;
}

function normalizeTweetMetrics(payload: Record<string, unknown>) {
  const publicMetrics = (payload.public_metrics || {}) as Record<string, unknown>;
  const organicMetrics = (payload.organic_metrics || {}) as Record<string, unknown>;
  const nonPublicMetrics = (payload.non_public_metrics || {}) as Record<string, unknown>;

  return {
    retweet_count: Number(publicMetrics.retweet_count || 0),
    reply_count: Number(publicMetrics.reply_count || 0),
    like_count: Number(publicMetrics.like_count || 0),
    quote_count: Number(publicMetrics.quote_count || 0),
    impression_count: Number(
      organicMetrics.impression_count ||
        nonPublicMetrics.impression_count ||
        publicMetrics.impression_count ||
        0
    ),
    bookmark_count: Number(
      organicMetrics.bookmark_count ||
        nonPublicMetrics.bookmark_count ||
        publicMetrics.bookmark_count ||
        0
    ),
  };
}

export async function fetchTwitterSignals(
  siteId: string,
  supabase = getSupabaseAdminClient()
): Promise<TwitterFetchResult> {
  const connection = await getTwitterConnection(siteId, supabase);
  if (!connection) {
    return { tweetsChecked: 0, snapshotsStored: 0, newSignals: 0 };
  }

  let accessToken = connection.access_token;
  if (!accessToken) {
    return { tweetsChecked: 0, snapshotsStored: 0, newSignals: 0 };
  }

  if (connection.token_expires_at && new Date(connection.token_expires_at) <= new Date()) {
    accessToken = await refreshTwitterConnectionToken(connection, supabase);
    if (!accessToken) {
      return { tweetsChecked: 0, snapshotsStored: 0, newSignals: 0 };
    }
  }

  const { data: items } = await supabase
    .from("content_items")
    .select("id, site_id, channel, status, published_url")
    .eq("site_id", siteId)
    .eq("channel", "twitter")
    .eq("status", "published")
    .not("published_url", "is", null)
    .limit(50);

  if (!items || items.length === 0) {
    return { tweetsChecked: 0, snapshotsStored: 0, newSignals: 0 };
  }

  let tweetsChecked = 0;
  let snapshotsStored = 0;
  let newSignals = 0;

  for (const item of items) {
    const tweetId = extractTweetId(item.published_url);
    if (!tweetId) continue;

    const res = await fetch(
      `https://api.twitter.com/2/tweets/${tweetId}?tweet.fields=public_metrics,organic_metrics,non_public_metrics`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!res.ok) {
      continue;
    }

    tweetsChecked += 1;

    const payload = await res.json();
    const tweet = (payload.data || {}) as Record<string, unknown>;
    const metrics = normalizeTweetMetrics(tweet);
    const previousSnapshot = await getLatestContentPerformanceSnapshot(item.id, supabase);
    const previousMetrics = (previousSnapshot?.metrics_json || {}) as Record<string, unknown>;

    await supabase.from("content_performance").insert({
      content_item_id: item.id,
      site_id: siteId,
      channel: "twitter",
      metrics_json: {
        ...metrics,
        tweet_id: tweetId,
      },
    });
    snapshotsStored += 1;

    const experimentId = await resolveExperimentIdForContent(siteId, "twitter", item.id, supabase);

    for (const metric of METRIC_MAP) {
      const nextValue = Number(metrics[metric.apiKey] || 0);
      const previousValue = Number(previousMetrics[metric.apiKey] || 0);
      if (nextValue === previousValue) continue;

      await recordGrowthSignal(
        {
          siteId,
          contentItemId: item.id,
          experimentId,
          channel: "twitter",
          signalType: "performance",
          metricName: metric.signalName,
          metricValue: nextValue,
          source: "twitter_api",
          metadata: {
            tweet_id: tweetId,
            previous_value: previousValue,
            delta: nextValue - previousValue,
          },
        },
        supabase
      );
      newSignals += 1;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return { tweetsChecked, snapshotsStored, newSignals };
}
