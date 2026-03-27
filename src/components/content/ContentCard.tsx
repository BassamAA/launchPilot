"use client";

import { useState } from "react";
import { ContentItem, ContentChannel } from "@/types";
import { Badge, Button, Spinner, cn } from "@/components/ui";
import {
  CheckIcon,
  PencilIcon,
  XMarkIcon,
  CalendarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowPathIcon,
  BoltIcon,
  ClipboardDocumentIcon,
} from "@heroicons/react/24/outline";

export const CHANNEL_CONFIG: Record<
  ContentChannel,
  { label: string; color: string; bg: string; icon: string }
> = {
  blog: { label: "Blog Post", color: "text-emerald-700", bg: "bg-emerald-50", icon: "✍️" },
  twitter: { label: "Twitter / X", color: "text-sky-700", bg: "bg-sky-50", icon: "𝕏" },
  linkedin: { label: "LinkedIn", color: "text-blue-700", bg: "bg-blue-50", icon: "in" },
  reddit: { label: "Reddit", color: "text-orange-700", bg: "bg-orange-50", icon: "🔴" },
  email: { label: "Cold Email", color: "text-violet-700", bg: "bg-violet-50", icon: "📧" },
  tiktok: { label: "TikTok/Reels", color: "text-pink-700", bg: "bg-pink-50", icon: "🎵" },
  directory: { label: "Directory", color: "text-indigo-700", bg: "bg-indigo-50", icon: "📋" },
};

interface ContentCardProps {
  item: ContentItem;
  onApprove: (id: string, body?: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onGenerate?: () => Promise<void>;
  onRegenerate?: () => Promise<void>;
  generating?: boolean;
  className?: string;
}

export function ContentCard({
  item,
  onApprove,
  onReject,
  onGenerate,
  onRegenerate,
  generating,
  className,
}: ContentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editedBody, setEditedBody] = useState(item.body);
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [copied, setCopied] = useState(false);

  const channel = CHANNEL_CONFIG[item.channel] || CHANNEL_CONFIG.blog;
  const hasContent = !!item.body;
  const preview = item.body
    ? item.body.slice(0, 180) + (item.body.length > 180 ? "…" : "")
    : "No content yet — click Generate to create this piece.";

  async function handleApprove() {
    setLoading("approve");
    try {
      await onApprove(item.id, editing ? editedBody : undefined);
    } finally {
      setLoading(null);
    }
  }

  async function handleReject() {
    setLoading("reject");
    try {
      await onReject(item.id);
    } finally {
      setLoading(null);
    }
  }

  async function handleCopy() {
    if (!item.body) return;
    try {
      await navigator.clipboard.writeText(item.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (HTTP, permissions denied) — silent fail
    }
  }

  const statusBadgeVariant =
    item.status === "approved" ? "success" :
    item.status === "published" ? "success" :
    item.status === "rejected" ? "danger" :
    item.status === "failed" ? "danger" : undefined;

  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden transition-all duration-200",
        expanded && "shadow-card-hover",
        !hasContent && "opacity-80",
        className
      )}
    >
      {/* Header row */}
      <div className="p-4 flex items-start gap-3">
        {/* Channel icon */}
        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 font-semibold",
            channel.bg
          )}
          aria-label={channel.label}
        >
          {channel.icon}
        </div>

        {/* Content summary */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span className={cn("text-xs font-semibold uppercase tracking-wide", channel.color)}>
              {channel.label}
            </span>
            {item.auto_executable && <Badge variant="info">Auto</Badge>}
            {item.variant_label && (
              <Badge variant={item.variant_label === "A_exploit" ? "success" : "warning"}>
                {item.variant_label === "A_exploit" ? "Variant A" : "Variant B"}
              </Badge>
            )}
            {statusBadgeVariant && (
              <Badge variant={statusBadgeVariant} className="capitalize">
                {item.status}
              </Badge>
            )}
          </div>
          <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
          {!expanded && (
            <p className={cn("text-sm mt-1 line-clamp-2", hasContent ? "text-gray-500" : "text-amber-500 italic")}>
              {preview}
            </p>
          )}
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 text-gray-400 hover:text-gray-600 flex-shrink-0 mt-0.5"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? (
            <ChevronUpIcon className="w-4 h-4" />
          ) : (
            <ChevronDownIcon className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {hasContent ? (
            <>
              {editing ? (
                <textarea
                  value={editedBody}
                  onChange={(e) => setEditedBody(e.target.value)}
                  className="w-full text-sm text-gray-700 border border-brand-300 rounded-lg p-3 min-h-[200px] resize-y focus:outline-none focus:ring-2 focus:ring-brand-100 font-mono"
                  autoFocus
                />
              ) : (
                <div className="relative bg-gray-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap max-h-72 overflow-y-auto">
                  {item.body}
                  {/* Copy button */}
                  <button
                    onClick={handleCopy}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-white border border-gray-200 text-gray-400 hover:text-gray-700 transition-colors"
                  >
                    {copied ? (
                      <CheckIcon className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              )}

              {/* Metadata chips */}
              <div className="flex flex-wrap gap-2">
                {item.scheduled_date && (
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <CalendarIcon className="w-3.5 h-3.5" />
                    {new Date(item.scheduled_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                )}
                {(item.metadata_json as { word_count?: number })?.word_count && (
                  <span className="text-xs text-gray-400">
                    {(item.metadata_json as { word_count: number }).word_count} words
                  </span>
                )}
                {(item.metadata_json as { target_subreddit?: string })?.target_subreddit && (
                  <Badge variant="warning" className="text-xs">
                    {(item.metadata_json as { target_subreddit: string }).target_subreddit}
                  </Badge>
                )}
                {(item.metadata_json as { directory_name?: string })?.directory_name && (
                  <Badge variant="info" className="text-xs">
                    {(item.metadata_json as { directory_name: string }).directory_name}
                  </Badge>
                )}
              </div>
            </>
          ) : (
            /* No content yet */
            <div className="bg-amber-50 rounded-lg p-4 text-center">
              <BoltIcon className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-amber-800 mb-1">Content not generated yet</p>
              <p className="text-xs text-amber-600">
                Click Generate below to create this piece using your marketing brief.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Action bar */}
      <div className="px-4 pb-4 pt-2 flex items-center gap-2 flex-wrap border-t border-gray-50">
        {/* Generating state */}
        {generating ? (
          <div className="flex items-center gap-2 text-sm text-brand-600 font-medium flex-1">
            <Spinner className="w-4 h-4" />
            Generating…
          </div>
        ) : !hasContent ? (
          /* No content — show Generate button */
          <Button
            variant="secondary"
            size="sm"
            onClick={onGenerate}
            className="flex-1"
          >
            <BoltIcon className="w-4 h-4" />
            Generate
          </Button>
        ) : item.status === "draft" ? (
          /* Has content and is pending — show approve / edit / reject */
          <>
            <Button
              variant="primary"
              size="sm"
              onClick={handleApprove}
              loading={loading === "approve"}
              className="flex-1"
            >
              <CheckIcon className="w-4 h-4" />
              Approve
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditing(!editing);
                setExpanded(true);
                setEditedBody(item.body);
              }}
            >
              <PencilIcon className="w-3.5 h-3.5" />
              {editing ? "Preview" : "Edit"}
            </Button>
            {onRegenerate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRegenerate}
                title="Regenerate"
              >
                <ArrowPathIcon className="w-3.5 h-3.5 text-gray-400" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReject}
              loading={loading === "reject"}
              className="text-red-400 hover:text-red-600 hover:bg-red-50"
              title="Reject"
            >
              <XMarkIcon className="w-4 h-4" />
            </Button>
          </>
        ) : (
          /* Approved / published / rejected — show copy + regenerate */
          <div className="flex items-center gap-2 w-full">
            {hasContent && (
              <Button variant="outline" size="sm" onClick={handleCopy}>
                <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                {copied ? "Copied!" : "Copy"}
              </Button>
            )}
            {onRegenerate && (
              <Button variant="ghost" size="sm" onClick={onRegenerate}>
                <ArrowPathIcon className="w-3.5 h-3.5" />
                Regenerate
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
