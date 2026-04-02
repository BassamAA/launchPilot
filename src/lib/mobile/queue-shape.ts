import { ContentItem, ContentMetadata } from "@/types";
import {
  getChannelIntentUrl,
  getManualCompleteLabel,
  getManualUrlLabel,
  getManualUrlPlaceholder,
  getPublishActionLabel,
  shouldCopyBeforeOpen,
} from "@/lib/channel-publishing";

export interface MobileQueueItem {
  id: string;
  channel: string;
  title: string | null;
  body: string | null;
  status: string;
  scheduledDate: string | null;
  publishedUrl: string | null;
  platformUrl: string | null;
  helper: {
    copyBeforeOpen: boolean;
    primaryLabel: string;
    completeLabel: string;
    urlLabel: string;
    urlPlaceholder: string;
  };
  context: Record<string, string | null>;
}

export function shapeQueueItem(item: ContentItem): MobileQueueItem {
  const metadata = (item.metadata_json || {}) as ContentMetadata;
  const body = item.body || item.title || "";

  return {
    id: item.id,
    channel: item.channel,
    title: item.title,
    body: item.body,
    status: item.status,
    scheduledDate: item.scheduled_date || null,
    publishedUrl: item.published_url || null,
    platformUrl: getChannelIntentUrl(item.channel, body, metadata),
    helper: {
      copyBeforeOpen: shouldCopyBeforeOpen(item.channel),
      primaryLabel: getPublishActionLabel(item.channel),
      completeLabel: getManualCompleteLabel(item.channel),
      urlLabel: getManualUrlLabel(item.channel),
      urlPlaceholder: getManualUrlPlaceholder(item.channel),
    },
    context: {
      targetSubreddit: (metadata.target_subreddit as string | undefined) || null,
      targetThreadUrl: (metadata.target_thread_url as string | undefined) || null,
      targetThreadTitle: (metadata.target_thread_title as string | undefined) || null,
      directoryName: (metadata.directory_name as string | undefined) || null,
      submissionUrl: (metadata.submission_url as string | undefined) || null,
    },
  };
}
