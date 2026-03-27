import { getSupabaseAdminClient } from "@/lib/supabase";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { recordGrowthSignal } from "@/lib/growth";
import { buildPostSlug, buildSiteSlug } from "@/lib/slugs";
import { logStructured } from "@/lib/observability";
import { publishToLinkedIn } from "@/lib/publishers/linkedin";
import { ContentMetadata, PlatformConnection, Site } from "@/types";

type PublishSource = "approve" | "manual" | "cron" | "auto_approve";

interface PublishResult {
  success: boolean;
  status:
    | "published"
    | "approved"
    | "scheduled"
    | "ready_to_publish"
    | "campaign_draft"
    | "ready_to_submit"
    | "ready_to_post"
    | "external_blog_pending"
    | "needs_connection"
    | "failed"
    | "not_found";
  message?: string;
  publishedUrl?: string | null;
  redirectUrl?: string;
  error?: string;
}

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

function getTwitterCallbackUrl() {
  return process.env.TWITTER_CALLBACK_URL || `${getAppUrl()}/api/auth/twitter/callback`;
}

function isFutureScheduledDate(date: string | null) {
  if (!date) return false;
  const today = new Date().toISOString().split("T")[0];
  return date > today;
}

async function logActivity(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  siteId: string,
  action: string,
  description: string,
  metadataJson: Record<string, unknown> = {}
) {
  await supabase.from("activity_log").insert({
    site_id: siteId,
    action,
    description,
    metadata_json: metadataJson,
  });
}

async function getPlatformConnection(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  siteId: string,
  platform: PlatformConnection["platform"]
) {
  const { data } = await supabase
    .from("platform_connections")
    .select("*")
    .eq("site_id", siteId)
    .eq("platform", platform)
    .single();

  return (data as PlatformConnection | null) ?? null;
}

async function ensureUniqueSiteSlug(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  site: Pick<Site, "id" | "name" | "url" | "slug">
) {
  if (site.slug) return site.slug;

  const base = buildSiteSlug(site.name, site.url);
  let candidate = base;
  let attempt = 1;

  while (true) {
    const { data: existing } = await supabase
      .from("sites")
      .select("id")
      .eq("slug", candidate)
      .neq("id", site.id)
      .limit(1);

    if (!existing || existing.length === 0) {
      await supabase.from("sites").update({ slug: candidate }).eq("id", site.id);
      return candidate;
    }

    attempt += 1;
    candidate = `${base}-${attempt}`;
  }
}

async function ensureUniquePostSlug(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  siteId: string,
  title: string,
  currentSlug?: string | null
) {
  if (currentSlug) return currentSlug;

  const base = buildPostSlug(title);
  const { data: existingPosts } = await supabase
    .from("content_items")
    .select("id, metadata_json")
    .eq("site_id", siteId)
    .eq("channel", "blog");

  const usedSlugs = new Set(
    (existingPosts || [])
      .map((post) => (post.metadata_json as ContentMetadata | null)?.post_slug)
      .filter(Boolean)
  );

  let candidate = base;
  let attempt = 1;
  while (usedSlugs.has(candidate)) {
    attempt += 1;
    candidate = `${base}-${attempt}`;
  }

  return candidate;
}

export async function refreshTwitterConnectionToken(
  connection: PlatformConnection,
  supabase = getSupabaseAdminClient()
) {
  const refreshToken = decryptSecret(connection.refresh_token_encrypted);
  if (!refreshToken) return null;

  const res = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`
      ).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.TWITTER_CLIENT_ID!,
    }),
  });

  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  const nextAccessToken = data.access_token as string | undefined;
  if (!nextAccessToken) return null;

  await supabase
    .from("platform_connections")
    .update({
      access_token_encrypted: encryptSecret(nextAccessToken),
      refresh_token_encrypted: encryptSecret((data.refresh_token as string | undefined) || refreshToken),
      expires_at: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", connection.id);

  return nextAccessToken;
}

export async function publishTweetForSite(
  siteId: string,
  text: string,
  supabase = getSupabaseAdminClient()
): Promise<{ success: boolean; tweetId?: string; error?: string }> {
  const connection = await getPlatformConnection(supabase, siteId, "twitter");
  if (!connection) {
    return { success: false, error: "Twitter is not connected for this site." };
  }

  let accessToken = decryptSecret(connection.access_token_encrypted);
  if (!accessToken) {
    return { success: false, error: "Twitter access token is missing." };
  }

  if (connection.expires_at && new Date(connection.expires_at) <= new Date()) {
    accessToken = await refreshTwitterConnectionToken(connection, supabase);
    if (!accessToken) {
      return { success: false, error: "Twitter token refresh failed. Reconnect Twitter." };
    }
  }

  const segments = text
    .split("\n\n---\n\n")
    .map((segment) => segment.trim())
    .filter(Boolean);

  let rootTweetId: string | undefined;
  let previousTweetId: string | undefined;

  for (const segment of segments.length > 0 ? segments : [text]) {
    const payload: Record<string, unknown> = { text: segment.slice(0, 280) };
    if (previousTweetId) {
      payload.reply = { in_reply_to_tweet_id: previousTweetId };
    }

    const res = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      return { success: false, error: await res.text() };
    }

    const data = await res.json();
    const tweetId = data.data?.id as string | undefined;
    if (!rootTweetId) {
      rootTweetId = tweetId;
    }
    previousTweetId = tweetId;
  }

  return { success: true, tweetId: rootTweetId };
}

export async function publishLinkedInPostForSite(
  siteId: string,
  text: string,
  supabase = getSupabaseAdminClient()
): Promise<{ success: boolean; postId?: string; error?: string }> {
  const connection = await getPlatformConnection(supabase, siteId, "linkedin");
  if (!connection) {
    return { success: false, error: "LinkedIn is not connected for this site." };
  }

  const accessToken = decryptSecret(connection.access_token_encrypted);
  if (!accessToken) {
    return { success: false, error: "LinkedIn access token is missing." };
  }

  const personUrn = connection.platform_user_id;
  if (!personUrn) {
    return { success: false, error: "LinkedIn profile URN is missing. Reconnect LinkedIn." };
  }

  try {
    const result = await publishToLinkedIn(text, accessToken, personUrn);
    return { success: true, postId: result.postId };
  } catch (error) {
    logStructured("error", "linkedin_publish_for_site_failed", {
      siteId,
      error: error instanceof Error ? error.message : String(error),
      person_urn: personUrn,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : "LinkedIn publish failed",
    };
  }
}

async function updateItem(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  itemId: string,
  updates: Record<string, unknown>
) {
  await supabase
    .from("content_items")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId);
}

export async function markContentItemManualComplete(
  contentItemId: string,
  options: {
    publishedUrl?: string | null;
    action?: string;
    description?: string;
    metadata?: Record<string, unknown>;
  },
  supabase = getSupabaseAdminClient()
) {
  const { data: item } = await supabase
    .from("content_items")
    .select("id, site_id, title, channel, metadata_json")
    .eq("id", contentItemId)
    .single();

  if (!item) {
    return { success: false, status: "not_found" as const, error: "Content item not found" };
  }

  const metadata = { ...(item.metadata_json || {}), ...(options.metadata || {}) };
  await updateItem(supabase, contentItemId, {
    status: "published",
    published_date: new Date().toISOString(),
    published_url: options.publishedUrl || null,
    metadata_json: metadata,
  });

  await logActivity(
    supabase,
    item.site_id,
    options.action || "content_published",
    options.description || `Marked as completed: ${item.title} (${item.channel})`,
    { content_item_id: contentItemId, published_url: options.publishedUrl || null, ...(options.metadata || {}) }
  );

  await recordGrowthSignal(
    {
      siteId: item.site_id,
      contentItemId,
      channel: item.channel,
      signalType: "published",
      metricName: "manual_publish",
      metricValue: 1,
      source: "runtime",
      metadata: { published_url: options.publishedUrl || null, manual: true },
    },
    supabase
  );

  return {
    success: true,
    status: "published" as const,
    publishedUrl: options.publishedUrl || null,
  };
}

export async function publishContentItem(
  contentItemId: string,
  source: PublishSource,
  supabase = getSupabaseAdminClient()
): Promise<PublishResult> {
  const { data: item } = await supabase
    .from("content_items")
    .select("*, sites(*)")
    .eq("id", contentItemId)
    .single();

  if (!item || !item.sites) {
    return { success: false, status: "not_found", error: "Content item not found" };
  }

  const metadata = (item.metadata_json || {}) as ContentMetadata;
  const site = item.sites as Site;

  if (item.channel === "twitter") {
    const connection = await getPlatformConnection(supabase, item.site_id, "twitter");

    if (!connection) {
      return {
        success: false,
        status: "needs_connection",
        message: "Connect Twitter before approving this post.",
        redirectUrl: `/sites/${item.site_id}/settings?tab=connections`,
      };
    }

    if ((source === "approve" || source === "auto_approve") && isFutureScheduledDate(item.scheduled_date)) {
      await updateItem(supabase, item.id, {
        status: "approved",
        metadata_json: {
          ...metadata,
          publish_state: "scheduled",
          scheduled_for_publish: item.scheduled_date,
        },
      });
      await logActivity(
        supabase,
        item.site_id,
        "content_scheduled",
        `Scheduled tweet for ${item.scheduled_date}`,
        { content_item_id: item.id, channel: "twitter" }
      );
      await recordGrowthSignal(
        {
          siteId: item.site_id,
          contentItemId: item.id,
          channel: "twitter",
          signalType: "scheduled",
          metricName: "scheduled_items",
          metricValue: 1,
          metadata: { scheduled_for: item.scheduled_date, source },
        },
        supabase
      );
      return { success: true, status: "scheduled", message: "Tweet queued for scheduled publishing." };
    }

    if (source === "approve" && !item.auto_executable) {
      await updateItem(supabase, item.id, {
        status: "approved",
        metadata_json: { ...metadata, publish_state: "ready_to_publish" },
      });
      await logActivity(
        supabase,
        item.site_id,
        "content_approved",
        `Tweet approved and ready to publish: ${item.title}`,
        { content_item_id: item.id, channel: "twitter" }
      );
      await recordGrowthSignal(
        {
          siteId: item.site_id,
          contentItemId: item.id,
          channel: "twitter",
          signalType: "approved",
          metricName: "ready_to_publish",
          metricValue: 1,
          metadata: { publish_state: "ready_to_publish" },
        },
        supabase
      );
      return {
        success: true,
        status: "ready_to_publish",
        message: "Tweet approved. Use Publish Now to send it to Twitter.",
      };
    }

    const result = await publishTweetForSite(item.site_id, item.body || item.title, supabase);
    if (!result.success) {
      await updateItem(supabase, item.id, {
        status: "failed",
        metadata_json: {
          ...metadata,
          publish_error: result.error,
          publish_error_at: new Date().toISOString(),
        },
      });
      await logActivity(
        supabase,
        item.site_id,
        "content_publish_failed",
        `Twitter publish failed for ${item.title}`,
        { content_item_id: item.id, channel: "twitter", error: result.error || null }
      );
      await recordGrowthSignal(
        {
          siteId: item.site_id,
          contentItemId: item.id,
          channel: "twitter",
          signalType: "publish_failed",
          metricName: "publish_failure",
          metricValue: 1,
          metadata: { error: result.error || null, source },
        },
        supabase
      );
      return {
        success: false,
        status: "failed",
        error: result.error || "Twitter publish failed",
      };
    }

    const publishedUrl = result.tweetId
      ? `https://twitter.com/i/web/status/${result.tweetId}`
      : null;

    await updateItem(supabase, item.id, {
      status: "published",
      published_date: new Date().toISOString(),
      published_url: publishedUrl,
      metadata_json: {
        ...metadata,
        publish_state: "published",
        published_via: "twitter",
      },
    });
    await logActivity(
      supabase,
      item.site_id,
      "published_twitter",
      `Published tweet: ${item.title}`,
      { content_item_id: item.id, tweet_id: result.tweetId || null, published_url: publishedUrl }
    );
    await recordGrowthSignal(
      {
        siteId: item.site_id,
        contentItemId: item.id,
        channel: "twitter",
        signalType: "published",
        metricName: "tweet_published",
        metricValue: 1,
        metadata: { tweet_id: result.tweetId || null, published_url: publishedUrl, source },
      },
      supabase
    );

    return { success: true, status: "published", publishedUrl };
  }

  if (item.channel === "linkedin") {
    const connection = await getPlatformConnection(supabase, item.site_id, "linkedin");

    if (!connection) {
      return {
        success: false,
        status: "needs_connection",
        message: "Connect LinkedIn before approving this post.",
        redirectUrl: `/sites/${item.site_id}/settings?tab=connections`,
      };
    }

    if ((source === "approve" || source === "auto_approve") && isFutureScheduledDate(item.scheduled_date)) {
      await updateItem(supabase, item.id, {
        status: "approved",
        metadata_json: {
          ...metadata,
          publish_state: "scheduled",
          scheduled_for_publish: item.scheduled_date,
        },
      });
      await logActivity(
        supabase,
        item.site_id,
        "content_scheduled",
        `Scheduled LinkedIn post for ${item.scheduled_date}`,
        { content_item_id: item.id, channel: "linkedin" }
      );
      await recordGrowthSignal(
        {
          siteId: item.site_id,
          contentItemId: item.id,
          channel: "linkedin",
          signalType: "scheduled",
          metricName: "scheduled_items",
          metricValue: 1,
          metadata: { scheduled_for: item.scheduled_date, source },
        },
        supabase
      );
      return { success: true, status: "scheduled", message: "LinkedIn post queued for scheduled publishing." };
    }

    if (source === "approve" && !item.auto_executable) {
      await updateItem(supabase, item.id, {
        status: "approved",
        metadata_json: { ...metadata, publish_state: "ready_to_publish" },
      });
      await logActivity(
        supabase,
        item.site_id,
        "content_approved",
        `LinkedIn post approved and ready to publish: ${item.title}`,
        { content_item_id: item.id, channel: "linkedin" }
      );
      await recordGrowthSignal(
        {
          siteId: item.site_id,
          contentItemId: item.id,
          channel: "linkedin",
          signalType: "approved",
          metricName: "ready_to_publish",
          metricValue: 1,
          metadata: { publish_state: "ready_to_publish" },
        },
        supabase
      );
      return {
        success: true,
        status: "ready_to_publish",
        message: "LinkedIn post approved. Use Publish Now to send it to LinkedIn.",
      };
    }

    const result = await publishLinkedInPostForSite(item.site_id, item.body || item.title, supabase);
    if (!result.success) {
      await updateItem(supabase, item.id, {
        status: "failed",
        metadata_json: {
          ...metadata,
          publish_error: result.error,
          publish_error_at: new Date().toISOString(),
        },
      });
      await logActivity(
        supabase,
        item.site_id,
        "content_publish_failed",
        `LinkedIn publish failed for ${item.title}`,
        { content_item_id: item.id, channel: "linkedin", error: result.error || null }
      );
      await recordGrowthSignal(
        {
          siteId: item.site_id,
          contentItemId: item.id,
          channel: "linkedin",
          signalType: "publish_failed",
          metricName: "publish_failure",
          metricValue: 1,
          metadata: { error: result.error || null, source },
        },
        supabase
      );
      return {
        success: false,
        status: "failed",
        error: result.error || "LinkedIn publish failed",
      };
    }

    const publishedUrl = result.postId
      ? `https://www.linkedin.com/feed/update/${result.postId}`
      : null;

    await updateItem(supabase, item.id, {
      status: "published",
      published_date: new Date().toISOString(),
      published_url: publishedUrl,
      metadata_json: {
        ...metadata,
        publish_state: "published",
        published_via: "linkedin",
      },
    });
    await logActivity(
      supabase,
      item.site_id,
      "published_linkedin",
      `Published LinkedIn post: ${item.title}`,
      { content_item_id: item.id, post_id: result.postId || null, published_url: publishedUrl }
    );
    await recordGrowthSignal(
      {
        siteId: item.site_id,
        contentItemId: item.id,
        channel: "linkedin",
        signalType: "published",
        metricName: "linkedin_published",
        metricValue: 1,
        metadata: { post_id: result.postId || null, published_url: publishedUrl, source },
      },
      supabase
    );

    return { success: true, status: "published", publishedUrl };
  }

  if (item.channel === "blog") {
    const blogConnection = await getPlatformConnection(supabase, item.site_id, "blog_external");
    const blogMode = (blogConnection?.metadata_json?.mode as string | undefined) || "hosted";

    if (blogMode === "external") {
      await updateItem(supabase, item.id, {
        status: "approved",
        metadata_json: { ...metadata, publish_state: "external_blog_pending" },
      });
      return {
        success: true,
        status: "external_blog_pending",
        message: "External blog publishing UI is ready, but the API integration is still coming soon.",
      };
    }

    if ((source === "approve" || source === "auto_approve") && isFutureScheduledDate(item.scheduled_date)) {
      await updateItem(supabase, item.id, {
        status: "approved",
        metadata_json: {
          ...metadata,
          publish_state: "scheduled",
          scheduled_for_publish: item.scheduled_date,
        },
      });
      await logActivity(
        supabase,
        item.site_id,
        "content_scheduled",
        `Scheduled hosted blog post for ${item.scheduled_date}`,
        { content_item_id: item.id, channel: "blog" }
      );
      await recordGrowthSignal(
        {
          siteId: item.site_id,
          contentItemId: item.id,
          channel: "blog",
          signalType: "scheduled",
          metricName: "scheduled_items",
          metricValue: 1,
          metadata: { scheduled_for: item.scheduled_date, source },
        },
        supabase
      );
      return { success: true, status: "scheduled", message: "Blog post queued for scheduled publish." };
    }

    const siteSlug = await ensureUniqueSiteSlug(supabase, site);
    const postSlug = await ensureUniquePostSlug(
      supabase,
      item.site_id,
      item.title,
      metadata.post_slug as string | undefined
    );
    const publishedUrl = `${getAppUrl()}/blog/${siteSlug}/${postSlug}`;

    await updateItem(supabase, item.id, {
      status: "published",
      published_date: new Date().toISOString(),
      published_url: publishedUrl,
      metadata_json: {
        ...metadata,
        post_slug: postSlug,
        publish_state: "published",
        published_via: "hosted_blog",
      },
    });

    await logActivity(
      supabase,
      item.site_id,
      "blog_published",
      `Hosted blog post published: ${item.title}`,
      { content_item_id: item.id, published_url: publishedUrl }
    );
    await recordGrowthSignal(
      {
        siteId: item.site_id,
        contentItemId: item.id,
        channel: "blog",
        signalType: "published",
        metricName: "blog_published",
        metricValue: 1,
        metadata: { published_url: publishedUrl, source },
      },
      supabase
    );

    return { success: true, status: "published", publishedUrl };
  }

  if (item.channel === "email" && source === "approve") {
    await updateItem(supabase, item.id, {
      status: "approved",
      metadata_json: { ...metadata, publish_state: "campaign_draft" },
    });
    await logActivity(
      supabase,
      item.site_id,
      "email_campaign_ready",
      `Email campaign ready for review: ${item.title}`,
      { content_item_id: item.id }
    );
    await recordGrowthSignal(
      {
        siteId: item.site_id,
        contentItemId: item.id,
        channel: "email",
        signalType: "approved",
        metricName: "campaign_ready",
        metricValue: 1,
        metadata: { publish_state: "campaign_draft" },
      },
      supabase
    );
    return {
      success: true,
      status: "campaign_draft",
      redirectUrl: `/sites/${item.site_id}/email/${item.id}`,
      message: "Email campaign prepared. Add recipients and send when ready.",
    };
  }

  if (item.channel === "directory" && source === "approve") {
    await updateItem(supabase, item.id, {
      status: "approved",
      metadata_json: { ...metadata, publish_state: "ready_to_submit" },
    });
    await logActivity(
      supabase,
      item.site_id,
      "directory_ready",
      `Directory submission ready: ${item.title}`,
      { content_item_id: item.id }
    );
    await recordGrowthSignal(
      {
        siteId: item.site_id,
        contentItemId: item.id,
        channel: "directory",
        signalType: "approved",
        metricName: "ready_to_submit",
        metricValue: 1,
        metadata: { publish_state: "ready_to_submit" },
      },
      supabase
    );
    return { success: true, status: "ready_to_submit" };
  }

  if (item.channel === "reddit" && source === "approve") {
    await updateItem(supabase, item.id, {
      status: "approved",
      metadata_json: { ...metadata, publish_state: "ready_to_post" },
    });
    await logActivity(
      supabase,
      item.site_id,
      "reddit_ready",
      `Reddit draft ready for manual posting: ${item.title}`,
      { content_item_id: item.id }
    );
    await recordGrowthSignal(
      {
        siteId: item.site_id,
        contentItemId: item.id,
        channel: "reddit",
        signalType: "approved",
        metricName: "ready_to_post",
        metricValue: 1,
        metadata: { publish_state: "ready_to_post" },
      },
      supabase
    );
    return { success: true, status: "ready_to_post" };
  }

  await updateItem(supabase, item.id, {
    status: "approved",
    metadata_json: { ...metadata, publish_state: "draft" },
  });
  await logActivity(
    supabase,
    item.site_id,
    "content_approved",
    `Approved: ${item.title} (${item.channel})`,
    { content_item_id: item.id }
  );
  await recordGrowthSignal(
    {
      siteId: item.site_id,
      contentItemId: item.id,
      channel: item.channel,
      signalType: "approved",
      metricName: "content_approved",
      metricValue: 1,
      metadata: { source },
    },
    supabase
  );

  return { success: true, status: "approved" };
}

export async function getBlogFeedData(
  siteSlug: string,
  supabase = getSupabaseAdminClient()
) {
  const { data: site } = await supabase
    .from("sites")
    .select("*")
    .eq("slug", siteSlug)
    .single();

  if (!site) return null;

  const { data: posts } = await supabase
    .from("content_items")
    .select("*")
    .eq("site_id", site.id)
    .eq("channel", "blog")
    .eq("status", "published")
    .order("published_date", { ascending: false });

  return {
    site: site as Site,
    posts: (posts || []).filter((post) => (post.metadata_json as ContentMetadata | null)?.post_slug),
  };
}

export { getTwitterCallbackUrl };
