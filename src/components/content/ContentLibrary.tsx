"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BRAND_NAME } from "@/lib/brand";
import { getPersonaChannelOrder } from "@/lib/onboarding";
import { Badge, Button, Input, Card, cn } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { CHANNEL_CONFIG } from "@/components/content/ContentCard";
import { ContentChannel, ContentItem, ContentMetadata, ContentStatus, OnboardingPersona } from "@/types";
import { ClipboardDocumentIcon, ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";

const STATUS_BADGE: Record<ContentStatus, "default" | "success" | "warning" | "danger" | "info"> = {
  draft: "warning",
  approved: "success",
  published: "success",
  rejected: "danger",
  failed: "danger",
};

interface ContentLibraryProps {
  siteId: string;
  items: ContentItem[];
  persona?: OnboardingPersona | null;
}

export function ContentLibrary({ siteId, items: initialItems, persona }: ContentLibraryProps) {
  const { toast } = useToast();
  const [items, setItems] = useState(initialItems);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [urlInputs, setUrlInputs] = useState<Record<string, string>>({});

  const grouped = useMemo(
    () =>
      items.reduce<Record<ContentChannel, ContentItem[]>>((acc, item) => {
        const channel = item.channel as ContentChannel;
        if (!acc[channel]) acc[channel] = [];
        acc[channel].push(item);
        return acc;
      }, {} as Record<ContentChannel, ContentItem[]>),
    [items]
  );
  const orderedChannels = useMemo(() => {
    const preferred = getPersonaChannelOrder(persona);
    return Object.keys(grouped)
      .sort((a, b) => preferred.indexOf(a as ContentChannel) - preferred.indexOf(b as ContentChannel));
  }, [grouped, persona]);

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    toast("Copied to clipboard.", "success");
  }

  async function publishNow(item: ContentItem) {
    setLoadingId(item.id);
    try {
      const route = item.channel === "twitter" ? "/api/twitter/publish" : "/api/publish";
      const res = await fetch(route, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_item_id: item.id }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(payload.error || "Publish failed.", "error");
        return;
      }

      setItems((current) =>
        current.map((candidate) =>
          candidate.id === item.id
            ? {
                ...candidate,
                status: "published",
                published_url: payload.published_url || candidate.published_url,
              }
            : candidate
        )
      );
      toast("Published successfully.", "success");
    } finally {
      setLoadingId(null);
    }
  }

  async function markManual(item: ContentItem, label: "posted" | "submitted") {
    setLoadingId(item.id);
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_item_id: item.id,
          published_url: urlInputs[item.id] || null,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(payload.error || `Failed to mark as ${label}.`, "error");
        return;
      }

      setItems((current) =>
        current.map((candidate) =>
          candidate.id === item.id
            ? {
                ...candidate,
                status: "published",
                published_url: payload.published_url || urlInputs[item.id] || candidate.published_url,
              }
            : candidate
        )
      );
      toast(`Marked as ${label}.`, "success");
    } finally {
      setLoadingId(null);
    }
  }

  if (items.length === 0) {
    const emptyMessage =
      persona === "creator"
        ? `Generate your first social-led batch to give ${BRAND_NAME} something to publish and learn from.`
        : persona === "service_provider"
          ? "Generate your first outreach and credibility assets to start filling the queue."
          : "Generate your 30-day plan first";
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-lg font-medium">No content generated yet</p>
        <p className="text-sm mt-2">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {orderedChannels.map((channelKey) => {
        const channelItems = grouped[channelKey as ContentChannel] || [];
        const channel = channelKey as ContentChannel;
        const config = CHANNEL_CONFIG[channel];
        if (!config || channelItems.length === 0) return null;

        return (
          <section key={channel}>
            <div className="mb-4 flex items-center gap-2">
              <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg text-sm", config.bg, config.color)}>
                {config.icon}
              </span>
              <h2 className="font-bold text-gray-900">{config.label}</h2>
              <Badge variant="default">{channelItems.length}</Badge>
            </div>

            <div className="space-y-4">
              {channelItems.map((item) => {
                const metadata = (item.metadata_json || {}) as ContentMetadata;
                const isManualTwitter = item.channel === "twitter" && item.status === "approved" && metadata.publish_state === "ready_to_publish";
                const isEmailCampaign = item.channel === "email" && item.status === "approved";
                const isDirectoryReady = item.channel === "directory" && item.status === "approved";
                const isRedditReady = item.channel === "reddit" && item.status === "approved";
                const externalUrl =
                  item.channel === "reddit"
                    ? (metadata.subreddit_url as string | undefined)
                    : (metadata.submission_url as string | undefined);

                return (
                  <Card key={item.id} padding="md" className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                          <Badge variant={STATUS_BADGE[item.status]} className="capitalize">
                            {item.status}
                          </Badge>
                          {item.variant_label && (
                            <Badge variant={item.variant_label === "A_exploit" ? "success" : "warning"}>
                              {item.variant_label === "A_exploit" ? "Variant A" : "Variant B"}
                            </Badge>
                          )}
                          {metadata.publish_state && metadata.publish_state !== "draft" && (
                            <Badge variant="info">{metadata.publish_state.replace(/_/g, " ")}</Badge>
                          )}
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                          {item.body || "No content generated yet."}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                      {item.published_url && (
                        <a href={item.published_url} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
                          Live URL
                        </a>
                      )}
                      {metadata.target_subreddit && <span>Target subreddit: {metadata.target_subreddit}</span>}
                      {metadata.target_thread_title && <span>Thread: {metadata.target_thread_title}</span>}
                      {metadata.directory_name && <span>Directory: {metadata.directory_name}</span>}
                      {item.scheduled_date && <span>Scheduled: {item.scheduled_date}</span>}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {item.body && (
                        <Button variant="outline" size="sm" onClick={() => copy(item.body)}>
                          <ClipboardDocumentIcon className="h-4 w-4" />
                          Copy
                        </Button>
                      )}

                      {item.published_url && (
                        <a href={item.published_url} target="_blank" rel="noreferrer">
                          <Button variant="outline" size="sm">
                            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                            Open live
                          </Button>
                        </a>
                      )}

                      {isManualTwitter && (
                        <Button size="sm" onClick={() => publishNow(item)} loading={loadingId === item.id}>
                          Publish Now
                        </Button>
                      )}

                      {isEmailCampaign && (
                        <Link href={`/sites/${siteId}/email/${item.id}`}>
                          <Button size="sm">Open campaign</Button>
                        </Link>
                      )}

                      {isRedditReady && metadata.target_thread_url && (
                        <a href={String(metadata.target_thread_url)} target="_blank" rel="noreferrer">
                          <Button variant="outline" size="sm">
                            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                            Open target thread
                          </Button>
                        </a>
                      )}

                      {(isDirectoryReady || isRedditReady) && externalUrl && (
                        <a href={externalUrl} target="_blank" rel="noreferrer">
                          <Button variant="outline" size="sm">
                            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                            {item.channel === "reddit" ? "Open in Reddit" : "Open submission page"}
                          </Button>
                        </a>
                      )}
                    </div>

                    {(isDirectoryReady || isRedditReady) && (
                      <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 md:flex-row md:items-end">
                        <div className="flex-1">
                          <Input
                            label={item.channel === "reddit" ? "Reddit URL" : "Listing URL"}
                            value={urlInputs[item.id] || ""}
                            onChange={(event) =>
                              setUrlInputs((current) => ({ ...current, [item.id]: event.target.value }))
                            }
                            placeholder={item.channel === "reddit" ? "https://reddit.com/..." : "https://directory.com/listing"}
                          />
                        </div>
                        <Button
                          size="sm"
                          onClick={() => markManual(item, item.channel === "reddit" ? "posted" : "submitted")}
                          loading={loadingId === item.id}
                        >
                          {item.channel === "reddit" ? "Mark as Posted" : "Mark as Submitted"}
                        </Button>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
