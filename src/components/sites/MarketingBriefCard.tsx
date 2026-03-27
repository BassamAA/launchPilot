"use client";

import { useState } from "react";
import { MarketingBrief } from "@/types";
import { Button, Card, Badge, Input, Textarea, cn } from "@/components/ui";
import { PencilIcon, CheckIcon } from "@heroicons/react/24/outline";
import { BRAND_NAME } from "@/lib/brand";

interface MarketingBriefCardProps {
  brief: MarketingBrief;
  onConfirm: (brief: MarketingBrief) => Promise<void>;
  isConfirmed?: boolean;
  loading?: boolean;
  sourcesJson?: Record<string, unknown>;
}

export function MarketingBriefCard({
  brief: initialBrief,
  onConfirm,
  isConfirmed,
  loading,
  sourcesJson,
}: MarketingBriefCardProps) {
  const [brief, setBrief] = useState<MarketingBrief>(initialBrief);
  const [editing, setEditing] = useState<string | null>(null);

  const sourceEntries = Object.entries((sourcesJson || {}) as Record<
    string,
    {
      analyzed?: boolean;
      url?: string;
      handle?: string;
      raw_data?: Record<string, unknown>;
    }
  >);

  const followerCounts = sourceEntries.reduce<Record<string, number | null>>((acc, [key, value]) => {
    const raw = value?.raw_data || {};
    const followerCount =
      typeof raw.followerCount === "number"
        ? raw.followerCount
        : typeof raw.subscriberCount === "number"
          ? raw.subscriberCount
          : null;
    acc[key] = followerCount;
    return acc;
  }, {});

  function updateField<K extends keyof MarketingBrief>(key: K, value: MarketingBrief[K]) {
    setBrief((prev) => ({ ...prev, [key]: value }));
  }

  const fields: Array<{
    key: keyof MarketingBrief;
    label: string;
    description: string;
    multiline?: boolean;
  }> = [
    { key: "product_name", label: "Product Name", description: "What your product is called" },
    { key: "one_liner", label: "One-Liner", description: "One sentence: what it does" },
    {
      key: "target_customer",
      label: "Target Customer",
      description: "The specific person who needs this",
      multiline: true,
    },
    {
      key: "pain_point",
      label: "Pain Point",
      description: "The exact problem being solved",
      multiline: true,
    },
    {
      key: "value_proposition",
      label: "Value Proposition",
      description: "Why someone should pay for this",
      multiline: true,
    },
    {
      key: "positioning",
      label: "Positioning & Tone",
      description: "How to talk about this product",
      multiline: true,
    },
  ];

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Your Marketing Brief</h2>
          <p className="text-sm text-gray-500 mt-1">
            Review and edit — this shapes everything {BRAND_NAME} generates
          </p>
        </div>
        {!isConfirmed && (
          <Button onClick={() => onConfirm(brief)} loading={loading} size="lg">
            <CheckIcon className="w-5 h-5" />
            Confirm Brief
          </Button>
        )}
        {isConfirmed && <Badge variant="success">Brief Confirmed</Badge>}
      </div>

      {/* Main fields */}
      <div className="grid grid-cols-1 gap-4">
        {fields.map(({ key, label, description, multiline }) => (
          <Card key={key} padding="md" className="group relative">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  {label}
                </p>
                <p className="text-xs text-gray-400">{description}</p>
              </div>
              {!isConfirmed && (
                <button
                  onClick={() => setEditing(editing === key ? null : key)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-brand-600"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
              )}
            </div>
            {editing === key ? (
              multiline ? (
                <Textarea
                  value={brief[key] as string}
                  onChange={(e) => updateField(key, e.target.value as never)}
                  className="mt-2"
                  autoFocus
                />
              ) : (
                <Input
                  value={brief[key] as string}
                  onChange={(e) => updateField(key, e.target.value as never)}
                  className="mt-2"
                  autoFocus
                />
              )
            ) : (
              <p className="text-sm text-gray-900 mt-1">{brief[key] as string}</p>
            )}
          </Card>
        ))}
      </div>

      {sourceEntries.length > 0 && (
        <Card padding="md">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Your Online Presence
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {BRAND_NAME} merged these sources into one business profile.
              </p>
            </div>
            <Badge variant="info">{sourceEntries.length} source{sourceEntries.length === 1 ? "" : "s"}</Badge>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {sourceEntries.map(([key, value]) => {
              const label =
                key === "website"
                  ? "Website"
                  : key === "twitter"
                    ? "Twitter / X"
                    : key === "instagram"
                      ? "Instagram"
                      : "LinkedIn";
              const target =
                value?.url ||
                (value?.handle
                  ? `@${value.handle}`
                  : "Provided");

              return (
                <div key={key} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-gray-900">{label}</p>
                    <Badge variant={value?.analyzed ? "success" : "warning"}>
                      {value?.analyzed ? "Analyzed" : "Limited"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-gray-600 break-all">{target}</p>
                  {typeof followerCounts[key] === "number" && (
                    <p className="mt-2 text-xs text-gray-500">
                      Followers: {followerCounts[key]?.toLocaleString()}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Keywords */}
      <Card padding="md">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          SEO Keywords ({brief.keywords.length})
        </p>
        <div className="flex flex-wrap gap-2">
          {brief.keywords.map((kw) => (
            <Badge key={kw} variant="purple" className="text-xs">
              {kw}
            </Badge>
          ))}
        </div>
      </Card>

      {/* Channels + Content angles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card padding="md">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Recommended Channels
          </p>
          <div className="space-y-2">
            {brief.recommended_channels.map((ch) => (
              <div key={ch.channel} className="flex items-start gap-2">
                <Badge variant="info" className="flex-shrink-0 mt-0.5">
                  #{ch.priority}
                </Badge>
                <div>
                  <p className="text-sm font-medium text-gray-900 capitalize">{ch.channel}</p>
                  <p className="text-xs text-gray-500">{ch.reasoning}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="md">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Content Angles
          </p>
          <ul className="space-y-2">
            {brief.content_angles.slice(0, 6).map((angle, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-brand-400 font-bold flex-shrink-0">→</span>
                {angle}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {(brief.business_type || brief.monetization_model || brief.existing_channels?.length) && (
        <Card padding="md">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Business Context
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Cross-channel signals {BRAND_NAME} inferred from your online presence.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {brief.business_type && <Badge variant="info">{brief.business_type}</Badge>}
              {brief.monetization_model && <Badge variant="purple">{brief.monetization_model}</Badge>}
            </div>
          </div>

          {brief.existing_channels && brief.existing_channels.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Existing Channels
              </p>
              <div className="flex flex-wrap gap-2">
                {brief.existing_channels.map((channel) => (
                  <Badge key={channel} variant="default">
                    {channel}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {brief.recommended_growth_surfaces && brief.recommended_growth_surfaces.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Recommended Growth Surfaces
              </p>
              <div className="flex flex-wrap gap-2">
                {brief.recommended_growth_surfaces.map((surface) => (
                  <Badge key={surface} variant="success">
                    {surface}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {(brief.channel_strengths && Object.keys(brief.channel_strengths).length > 0) ||
      (brief.channel_gaps && Object.keys(brief.channel_gaps).length > 0) ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {brief.channel_strengths && Object.keys(brief.channel_strengths).length > 0 && (
            <Card padding="md">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Channel Strengths
              </p>
              <div className="space-y-3">
                {Object.entries(brief.channel_strengths).map(([channel, summary]) => (
                  <div key={channel} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <p className="text-sm font-semibold text-gray-900 capitalize">{channel}</p>
                    <p className="mt-1 text-sm text-gray-600">{summary}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {brief.channel_gaps && Object.keys(brief.channel_gaps).length > 0 && (
            <Card padding="md">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Growth Gaps
              </p>
              <div className="space-y-3">
                {Object.entries(brief.channel_gaps).map(([channel, summary]) => (
                  <div key={channel} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <p className="text-sm font-semibold text-gray-900 capitalize">{channel}</p>
                    <p className="mt-1 text-sm text-gray-600">{summary}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      ) : null}

      {/* Competitors */}
      {brief.competitors.length > 0 && (
        <Card padding="md">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Competitive Landscape
          </p>
          <div className="flex flex-wrap gap-2">
            {brief.competitors.map((comp) => (
              <Badge key={comp} variant="warning">
                {comp}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {brief.subreddit_research && brief.subreddit_research.length > 0 && (
        <Card padding="md">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Reddit Research
          </p>
          <div className="space-y-4">
            {brief.subreddit_research.map((subreddit) => (
              <div key={subreddit.subreddit} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="info">{subreddit.subreddit}</Badge>
                  <span className="text-xs text-gray-400">{subreddit.subscriber_count}</span>
                  <a
                    href={subreddit.subreddit_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-brand-600 hover:underline"
                  >
                    Open subreddit
                  </a>
                </div>
                <p className="mt-3 text-sm text-gray-700">
                  <span className="font-medium text-gray-900">Rules:</span> {subreddit.rules_summary}
                </p>
                <p className="mt-2 text-sm text-gray-700">
                  <span className="font-medium text-gray-900">Best time:</span> {subreddit.best_time_to_post}
                </p>
                <p className="mt-2 text-sm text-gray-700">
                  <span className="font-medium text-gray-900">Example post:</span> {subreddit.example_post_title}
                </p>
                {subreddit.example_post_url && (
                  <a
                    href={subreddit.example_post_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex text-sm text-brand-600 hover:underline"
                  >
                    View example
                  </a>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
