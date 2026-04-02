"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BRAND_NAME } from "@/lib/brand";
import { getPersonaChannelOrder } from "@/lib/onboarding";
import { Badge, Button, Card, cn } from "@/components/ui";
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
  const [items] = useState(initialItems);

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
    return Object.keys(grouped).sort((a, b) => preferred.indexOf(a as ContentChannel) - preferred.indexOf(b as ContentChannel));
  }, [grouped, persona]);

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    toast("Copied to clipboard.", "success");
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
                const isEmailCampaign = item.channel === "email" && item.status === "approved";

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
                        <Button variant="outline" size="sm" onClick={() => copy(item.body!)}>
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

                      {isEmailCampaign && (
                        <Link href={`/sites/${siteId}/email/${item.id}`}>
                          <Button size="sm">Open campaign</Button>
                        </Link>
                      )}

                      {metadata.target_thread_url && (
                        <a href={String(metadata.target_thread_url)} target="_blank" rel="noreferrer">
                          <Button variant="outline" size="sm">
                            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                            Open target thread
                          </Button>
                        </a>
                      )}

                      {item.status !== "published" && item.channel !== "email" && (
                        <Link href={`/sites/${siteId}/queue`}>
                          <Button size="sm">Open in Queue</Button>
                        </Link>
                      )}
                    </div>

                    {item.status !== "published" && item.channel !== "email" && (
                      <div className="border-t border-gray-100 pt-4 text-xs text-gray-500">
                        Posting is handled in Queue so there’s one place for approve / post / mark-complete.
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
