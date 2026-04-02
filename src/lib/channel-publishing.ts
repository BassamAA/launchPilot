import { ContentChannel, ContentMetadata } from "@/types";

export type ManualPostingChannel =
  | "twitter"
  | "linkedin"
  | "instagram"
  | "reddit"
  | "tiktok"
  | "facebook"
  | "directory";

export interface ChannelHandoff {
  channel: string;
  label: string;
  actionLabel: string;
  url: string | null;
  supportsPrefill: boolean;
  bestEffort: boolean;
  shouldCopyBeforeOpen: boolean;
  fallbackHint: string;
}

function normalizeChannel(channel: string): ManualPostingChannel | "blog" | "email" | "other" {
  if (channel === "tweet" || channel === "twitter") return "twitter";
  if (channel === "linkedin") return "linkedin";
  if (channel === "instagram") return "instagram";
  if (channel === "reddit") return "reddit";
  if (channel === "tiktok") return "tiktok";
  if (channel === "facebook") return "facebook";
  if (channel === "directory") return "directory";
  if (channel === "blog") return "blog";
  if (channel === "email") return "email";
  return "other";
}

export function getChannelLabel(channel: string): string {
  const normalized = normalizeChannel(channel);
  switch (normalized) {
    case "twitter":
      return "Tweet";
    case "linkedin":
      return "LinkedIn";
    case "instagram":
      return "Instagram";
    case "reddit":
      return "Reddit";
    case "tiktok":
      return "TikTok";
    case "facebook":
      return "Facebook";
    case "directory":
      return "Directory";
    case "blog":
      return "Blog";
    case "email":
      return "Email";
    default:
      return channel;
  }
}

export function getChannelIntentUrl(channel: string, text: string, metadata?: ContentMetadata | null): string | null {
  const normalized = normalizeChannel(channel);
  switch (normalized) {
    case "twitter":
      return `https://x.com/intent/tweet?text=${encodeURIComponent(text.slice(0, 280))}`;
    case "linkedin":
      return "https://www.linkedin.com/feed/";
    case "instagram":
      return "https://www.instagram.com/";
    case "reddit":
      return (metadata?.target_thread_url as string | undefined) || (metadata?.subreddit_url as string | undefined) || "https://www.reddit.com/submit";
    case "tiktok":
      return "https://www.tiktok.com/upload";
    case "facebook":
      return "https://www.facebook.com/";
    case "directory":
      return (metadata?.submission_url as string | undefined) || null;
    case "email": {
      const subject = encodeURIComponent((metadata?.email_subject as string | undefined) || "Update from BreakthroughPilot");
      return `mailto:?subject=${subject}&body=${encodeURIComponent(text)}`;
    }
    default:
      return null;
  }
}

export function getPublishActionLabel(channel: string): string {
  const normalized = normalizeChannel(channel);
  switch (normalized) {
    case "twitter":
      return "Post on X";
    case "linkedin":
      return "Post on LinkedIn";
    case "instagram":
      return "Post on Instagram";
    case "reddit":
      return "Post on Reddit";
    case "tiktok":
      return "Post on TikTok";
    case "facebook":
      return "Post on Facebook";
    case "directory":
      return "Open submission page";
    case "email":
      return "Open email draft";
    case "blog":
      return "Publish post";
    default:
      return "Publish";
  }
}

export function isManualPostingChannel(channel: string): boolean {
  return ["twitter", "linkedin", "instagram", "reddit", "tiktok", "facebook", "directory", "email"].includes(normalizeChannel(channel));
}

export function shouldCopyBeforeOpen(channel: string): boolean {
  return normalizeChannel(channel) !== "twitter" && normalizeChannel(channel) !== "email";
}

export function getManualUrlLabel(channel: string): string {
  const normalized = normalizeChannel(channel);
  if (normalized === "reddit") return "Reddit URL";
  if (normalized === "directory") return "Listing URL";
  if (normalized === "email") return "Sent email URL (optional)";
  return "Published URL";
}

export function getManualUrlPlaceholder(channel: string): string {
  const normalized = normalizeChannel(channel);
  if (normalized === "reddit") return "https://reddit.com/...";
  if (normalized === "directory") return "https://directory.com/listing";
  return "https://...";
}

export function getManualCompleteLabel(channel: string): string {
  const normalized = normalizeChannel(channel);
  if (normalized === "directory") return "Mark as submitted";
  if (normalized === "email") return "Mark as sent";
  return "Mark as posted";
}

export function isActionableFromQueue(channel: ContentChannel | string): boolean {
  return normalizeChannel(channel) !== "other";
}

export function getChannelFallbackHint(channel: string): string {
  const normalized = normalizeChannel(channel);
  switch (normalized) {
    case "twitter":
      return "Opens X with the draft prefilled when possible.";
    case "linkedin":
      return "Opens LinkedIn. If text cannot be prefilled, copy the draft and paste it into the compose box.";
    case "instagram":
      return "Copies the caption and opens Instagram so you can paste it manually.";
    case "reddit":
      return "Opens the best available Reddit post flow. You may still need to paste or choose a subreddit.";
    case "tiktok":
      return "Copies the caption/script and opens TikTok for manual posting.";
    case "facebook":
      return "Opens Facebook. You may need to paste the text manually.";
    case "directory":
      return "Opens the submission page so you can paste and submit manually.";
    case "email":
      return "Opens your mail app with a drafted email when possible.";
    default:
      return "Best-effort handoff.";
  }
}

export function getChannelHandoff(channel: string, text: string, metadata?: ContentMetadata | null): ChannelHandoff {
  const normalized = normalizeChannel(channel);
  const url = getChannelIntentUrl(channel, text, metadata);
  return {
    channel: normalized,
    label: getChannelLabel(channel),
    actionLabel: getPublishActionLabel(channel),
    url,
    supportsPrefill: normalized === "twitter" || normalized === "email",
    bestEffort: normalized !== "twitter" && normalized !== "email",
    shouldCopyBeforeOpen: shouldCopyBeforeOpen(channel),
    fallbackHint: getChannelFallbackHint(channel),
  };
}
