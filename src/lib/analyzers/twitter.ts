import * as cheerio from "cheerio";
import { decryptSecret } from "@/lib/crypto";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { PlatformConnection } from "@/types";
import { TwitterAnalysis } from "@/lib/analyzers/types";

type SupabaseAdmin = ReturnType<typeof getSupabaseAdminClient>;
type TwitterMetricBag = {
  like_count?: number;
  retweet_count?: number;
  reply_count?: number;
  impression_count?: number;
  followers_count?: number;
  following_count?: number;
  tweet_count?: number;
};

function normalizeHandle(handle: string) {
  return handle.replace(/^@/, "").trim();
}

function inferVoiceTone(text: string) {
  const lower = text.toLowerCase();
  if (/\bbuild|ship|founder|we\b/.test(lower)) return "founder-led and conversational";
  if (/\bguide|learn|tips|framework\b/.test(lower)) return "educational and professional";
  if (/\bhot take|wrong|stop\b/.test(lower)) return "opinionated";
  return "professional";
}

function extractCommonTopics(tweets: string[]) {
  const counts = new Map<string, number>();
  const stopWords = new Set(["the", "and", "that", "with", "this", "from", "your", "about", "https", "have"]);
  for (const tweet of tweets) {
    for (const word of tweet.toLowerCase().match(/[a-z][a-z0-9_-]{3,}/g) || []) {
      if (stopWords.has(word)) continue;
      counts.set(word, (counts.get(word) || 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);
}

function estimatePostingFrequency(tweetDates: string[]) {
  if (tweetDates.length < 2) return "Unknown";
  const newest = new Date(tweetDates[0]).getTime();
  const oldest = new Date(tweetDates[tweetDates.length - 1]).getTime();
  const days = Math.max(1, (newest - oldest) / (1000 * 60 * 60 * 24));
  const perWeek = Math.round((tweetDates.length / days) * 7 * 10) / 10;
  if (perWeek >= 7) return "Daily or more";
  if (perWeek >= 3) return `${perWeek} times per week`;
  if (perWeek >= 1) return "1-2 times per week";
  return "Less than weekly";
}

async function getSiteTwitterConnection(siteId: string | undefined, supabase: SupabaseAdmin) {
  if (!siteId) return null;
  const { data } = await supabase
    .from("platform_connections")
    .select("*")
    .eq("site_id", siteId)
    .eq("platform", "twitter")
    .maybeSingle();
  return (data as PlatformConnection | null) ?? null;
}

async function analyzeViaApi(handle: string, accessToken: string): Promise<TwitterAnalysis | null> {
  const profileRes = await fetch(
    `https://api.twitter.com/2/users/by/username/${handle}?user.fields=description,public_metrics,profile_image_url,url,created_at`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!profileRes.ok) return null;

  const profilePayload = await profileRes.json();
  const user = profilePayload.data as Record<string, unknown> | undefined;
  if (!user?.id) return null;

  const tweetsRes = await fetch(
    `https://api.twitter.com/2/users/${user.id}/tweets?max_results=20&tweet.fields=public_metrics,created_at`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const tweetsPayload = tweetsRes.ok ? await tweetsRes.json() : { data: [] };
  const recentTweets = ((tweetsPayload.data || []) as Array<Record<string, unknown>>).map((tweet) => {
    const publicMetrics = (tweet.public_metrics || {}) as TwitterMetricBag;
    const organicMetrics = (tweet.organic_metrics || {}) as TwitterMetricBag;

    return {
      text: String(tweet.text || ""),
      likes: Number(publicMetrics.like_count || 0),
      retweets: Number(publicMetrics.retweet_count || 0),
      replies: Number(publicMetrics.reply_count || 0),
      impressions: Number(organicMetrics.impression_count || publicMetrics.impression_count || 0),
      createdAt: String(tweet.created_at || new Date().toISOString()),
    };
  });
  const topTweets = [...recentTweets]
    .sort((a, b) => b.likes + b.retweets + b.replies - (a.likes + a.retweets + a.replies))
    .slice(0, 5);

  const userMetrics = (user.public_metrics || {}) as TwitterMetricBag;

  return {
    source: "twitter",
    handle,
    displayName: String(user.name || handle),
    bio: String(user.description || ""),
    followerCount: Number(userMetrics.followers_count || 0),
    followingCount: Number(userMetrics.following_count || 0),
    tweetCount: Number(userMetrics.tweet_count || 0),
    profileUrl: `https://x.com/${handle}`,
    websiteFromBio: typeof user.url === "string" ? user.url : null,
    recentTweets,
    topTweets,
    commonTopics: extractCommonTopics(recentTweets.map((tweet) => tweet.text)),
    averageEngagement:
      recentTweets.length > 0
        ? Math.round(
            recentTweets.reduce((sum, tweet) => sum + tweet.likes + tweet.retweets + tweet.replies, 0) /
              recentTweets.length
          )
        : 0,
    postingFrequency: estimatePostingFrequency(recentTweets.map((tweet) => tweet.createdAt)),
    voiceTone: inferVoiceTone(recentTweets.map((tweet) => tweet.text).join(" ")),
    raw: { user, tweets: tweetsPayload.data || [] },
  };
}

async function analyzeViaPublicProfile(handle: string): Promise<TwitterAnalysis> {
  const url = `https://x.com/${handle}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; LaunchPilot/1.0; +https://launchpilot.app)",
      Accept: "text/html",
    },
    next: { revalidate: 0 },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`Could not fetch public Twitter profile for @${handle}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);
  const title = $("title").text().trim();
  const description =
    $('meta[property="og:description"]').attr("content") ||
    $('meta[name="description"]').attr("content") ||
    "";

  const followerMatch = description.match(/([\d.,]+)\s+Followers/i);
  const followingMatch = description.match(/([\d.,]+)\s+Following/i);
  const postsMatch = description.match(/([\d.,]+)\s+Posts?/i);

  return {
    source: "twitter",
    handle,
    displayName: title.replace(/\s*\(@.*$/, "").trim() || handle,
    bio: description,
    followerCount: followerMatch ? Number(followerMatch[1].replace(/[^\d.]/g, "")) : 0,
    followingCount: followingMatch ? Number(followingMatch[1].replace(/[^\d.]/g, "")) : 0,
    tweetCount: postsMatch ? Number(postsMatch[1].replace(/[^\d.]/g, "")) : 0,
    profileUrl: url,
    websiteFromBio: $('meta[property="og:url"]').attr("content") || null,
    recentTweets: [],
    topTweets: [],
    commonTopics: [],
    averageEngagement: 0,
    postingFrequency: "Unknown",
    voiceTone: inferVoiceTone(description),
    raw: { title, description },
  };
}

export async function analyzeTwitter(handle: string, siteId?: string): Promise<TwitterAnalysis> {
  const normalized = normalizeHandle(handle);
  const supabase = getSupabaseAdminClient();
  const connection = await getSiteTwitterConnection(siteId, supabase);
  const accessToken = connection ? decryptSecret(connection.access_token_encrypted) : null;

  if (accessToken) {
    const viaApi = await analyzeViaApi(normalized, accessToken);
    if (viaApi) return viaApi;
  }

  return analyzeViaPublicProfile(normalized);
}
