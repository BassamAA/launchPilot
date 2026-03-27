import crypto from "crypto";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { ContentChannel, ContentMetadata, Site, TrackedLink } from "@/types";

type SupabaseAdmin = ReturnType<typeof getSupabaseAdminClient>;

interface CreateTrackedLinkInput {
  siteId: string;
  contentItemId?: string | null;
  experimentId?: string | null;
  destinationUrl: string;
  channel: ContentChannel;
  utmCampaign?: string | null;
  utmContent?: string | null;
}

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

function randomCode(length = 10) {
  return crypto.randomBytes(length).toString("base64url").replace(/[-_]/g, "").slice(0, length);
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeUrl(url: string) {
  return url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
}

function hostnameFor(url: string) {
  try {
    return new URL(normalizeUrl(url)).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function isTrackableDestination(destinationUrl: string, siteUrl: string) {
  const siteHost = hostnameFor(siteUrl);
  const destinationHost = hostnameFor(destinationUrl);
  return !!siteHost && !!destinationHost && siteHost === destinationHost;
}

export function appendAttributionParams(destinationUrl: string, trackedLink: Pick<TrackedLink, "short_code" | "utm_source" | "utm_medium" | "utm_campaign" | "utm_content">) {
  const url = new URL(normalizeUrl(destinationUrl));

  url.searchParams.set("utm_source", trackedLink.utm_source);
  url.searchParams.set("utm_medium", trackedLink.utm_medium);
  if (trackedLink.utm_campaign) {
    url.searchParams.set("utm_campaign", trackedLink.utm_campaign);
  }
  if (trackedLink.utm_content) {
    url.searchParams.set("utm_content", trackedLink.utm_content);
  }
  url.searchParams.set("lp_tid", trackedLink.short_code);

  return url.toString();
}

export async function resolveShortCode(code: string, supabase = getSupabaseAdminClient()) {
  const { data } = await supabase
    .from("tracked_links")
    .select("*")
    .eq("short_code", code)
    .maybeSingle();

  return (data as TrackedLink | null) ?? null;
}

export async function createTrackedLink(
  input: CreateTrackedLinkInput,
  supabase = getSupabaseAdminClient()
) {
  if (input.contentItemId) {
    const { data: existing } = await supabase
      .from("tracked_links")
      .select("*")
      .eq("content_item_id", input.contentItemId)
      .eq("channel", input.channel)
      .eq("destination_url", input.destinationUrl)
      .maybeSingle();

    if (existing) {
      const tracked = existing as TrackedLink;
      return {
        trackedLink: tracked,
        trackedUrl: `${getAppUrl()}/go/${tracked.short_code}`,
      };
    }
  }

  let shortCode = randomCode();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data: collision } = await supabase
      .from("tracked_links")
      .select("id")
      .eq("short_code", shortCode)
      .maybeSingle();
    if (!collision) break;
    shortCode = randomCode();
  }

  const { data } = await supabase
    .from("tracked_links")
    .insert({
      site_id: input.siteId,
      content_item_id: input.contentItemId || null,
      experiment_id: input.experimentId || null,
      destination_url: input.destinationUrl,
      short_code: shortCode,
      channel: input.channel,
      utm_source: "launchpilot",
      utm_medium: input.channel,
      utm_campaign: input.utmCampaign || null,
      utm_content: input.utmContent || input.contentItemId || null,
    })
    .select("*")
    .single();

  const trackedLink = data as TrackedLink;
  return {
    trackedLink,
    trackedUrl: `${getAppUrl()}/go/${trackedLink.short_code}`,
  };
}

function replaceKnownUrls(body: string, siteUrl: string, trackedUrl: string) {
  const normalizedSiteUrl = normalizeUrl(siteUrl);
  const variants = [
    normalizedSiteUrl,
    normalizedSiteUrl.replace(/^https?:\/\//, ""),
    normalizeUrl(siteUrl).replace(/\/$/, ""),
    normalizeUrl(siteUrl).replace(/^https?:\/\//, "").replace(/\/$/, ""),
  ].filter(Boolean);

  let updated = body;
  for (const variant of Array.from(new Set(variants))) {
    updated = updated.replace(new RegExp(escapeRegex(variant), "g"), trackedUrl);
  }
  return updated;
}

function addTrackedCta(body: string, trackedUrl: string, channel: ContentChannel, productName: string) {
  if (body.includes(trackedUrl)) return body;

  switch (channel) {
    case "blog":
      return `${body}\n\n## Try ${productName}\n\nReady to see it in action? [Visit ${productName}](${trackedUrl}).`;
    case "email":
      return `${body}\n\nTry it here: ${trackedUrl}`;
    case "reddit":
      return `${body}\n\nIf you want to check it out: ${trackedUrl}`;
    case "directory":
      return `${body}\n\nProduct URL: ${trackedUrl}`;
    case "twitter": {
      const segments = body.split("\n\n---\n\n");
      const lastIndex = segments.length - 1;
      const suffix = trackedUrl;
      const candidate = `${segments[lastIndex].trim()} ${suffix}`.trim();
      if (candidate.length <= 280) {
        segments[lastIndex] = candidate;
        return segments.join("\n\n---\n\n");
      }

      const allowed = Math.max(0, 279 - suffix.length - 1);
      const trimmed = segments[lastIndex].slice(0, Math.max(0, allowed - 1)).trimEnd();
      segments[lastIndex] = `${trimmed}… ${suffix}`.trim();
      return segments.join("\n\n---\n\n");
    }
    default:
      return body;
  }
}

export async function attachTrackedLinkToContentItem(
  input: {
    body: string;
    metadata: ContentMetadata;
    site: Pick<Site, "id" | "url" | "name">;
    contentItemId: string;
    channel: ContentChannel;
    planId?: string | null;
    experimentId?: string | null;
  },
  supabase = getSupabaseAdminClient()
) {
  if (!["blog", "twitter", "email", "reddit", "directory"].includes(input.channel)) {
    return { body: input.body, metadata: input.metadata };
  }

  const { trackedLink, trackedUrl } = await createTrackedLink(
    {
      siteId: input.site.id,
      contentItemId: input.contentItemId,
      experimentId: input.experimentId,
      destinationUrl: normalizeUrl(input.site.url),
      channel: input.channel,
      utmCampaign: input.planId || null,
      utmContent: input.contentItemId,
    },
    supabase
  );

  const replaced = replaceKnownUrls(input.body, input.site.url, trackedUrl);
  const body = addTrackedCta(replaced, trackedUrl, input.channel, input.site.name || "the product");

  return {
    body,
    metadata: {
      ...input.metadata,
      tracked_link_id: trackedLink.id,
      tracked_link_url: trackedUrl,
      tracked_link_code: trackedLink.short_code,
    } as ContentMetadata,
  };
}
