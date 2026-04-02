"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ContentItem, ContentMetadata } from "@/types";
import { Spinner } from "@/components/ui";
import {
  getChannelIntentUrl,
  getChannelLabel,
  getManualCompleteLabel,
  getManualUrlLabel,
  getPublishActionLabel,
  isManualPostingChannel,
  shouldCopyBeforeOpen,
} from "@/lib/channel-publishing";

function publishStyle(channel: string): string {
  if (channel === "tweet" || channel === "twitter") {
    return "bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100";
  }
  if (channel === "linkedin") return "bg-blue-600 text-white hover:bg-blue-700";
  if (channel === "instagram") {
    return "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600";
  }
  if (channel === "reddit") return "bg-orange-500 text-white hover:bg-orange-600";
  if (channel === "tiktok") return "bg-black text-white hover:bg-gray-800";
  if (channel === "facebook") return "bg-blue-700 text-white hover:bg-blue-800";
  return "bg-brand-500 text-white hover:bg-brand-600";
}

function InboxCard({
  item,
  onRemove,
}: {
  item: ContentItem;
  onRemove: (id: string) => void;
}) {
  const [body, setBody] = useState(item.body ?? "");
  const [editing, setEditing] = useState(false);
  const [editedBody, setEditedBody] = useState(item.body ?? "");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasBody = !!body;
  const label = getChannelLabel(item.channel);
  const metadata = (item.metadata_json || {}) as ContentMetadata;

  async function generate() {
    setLoading("generate");
    setError(null);
    try {
      const res = await fetch("/api/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_item_id: item.id }),
      });
      if (!res.ok) throw new Error("Generation failed");
      const r2 = await fetch(`/api/content-item?id=${item.id}`);
      if (r2.ok) {
        const updated = await r2.json();
        setBody(updated.body ?? "");
        setEditedBody(updated.body ?? "");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(null);
    }
  }

  function markPublished(publishedUrl?: string | null) {
    fetch("/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content_item_id: item.id,
        intent: true,
        published_url: publishedUrl || null,
        ...(editing && editedBody !== body ? { edited_body: editedBody } : {}),
      }),
    }).catch(() => {});
    onRemove(item.id);
    if (editing && editedBody !== body) setBody(editedBody);
    setEditing(false);
  }

  async function reject() {
    setLoading("reject");
    try {
      await fetch("/api/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_item_id: item.id }),
      });
      onRemove(item.id);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="flex items-center gap-2 px-4 pt-3 pb-2 flex-wrap">
        <span className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500 tracking-wide">
          {label}
        </span>
        {item.title && (
          <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">{item.title}</span>
        )}
        {!hasBody && <span className="text-xs text-gray-400 italic">Draft not generated yet</span>}
      </div>

      {hasBody && !editing && (
        <p className="px-4 pb-3 text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-line">
          {body}
        </p>
      )}

      {editing && (
        <div className="px-4 pb-3">
          <textarea
            value={editedBody}
            onChange={(e) => setEditedBody(e.target.value)}
            rows={5}
            autoFocus
            className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>
      )}

      {error && <p className="px-4 pb-2 text-xs text-red-500">{error}</p>}

      <div className="border-t border-gray-50 dark:border-gray-700/50 px-4 py-2.5 flex items-center gap-2 flex-wrap">
        {!hasBody && (
          <button
            onClick={generate}
            disabled={!!loading}
            className="text-xs font-semibold bg-brand-500 text-white px-3 py-1.5 rounded-lg hover:bg-brand-600 disabled:opacity-50 transition-colors"
          >
            {loading === "generate" ? "Generating…" : "Generate draft"}
          </button>
        )}

        {hasBody && (() => {
          const currentBody = editing ? editedBody : body;
          const intentUrl = getChannelIntentUrl(item.channel, currentBody, metadata);
          const btnLabel = editing ? `Save & ${getPublishActionLabel(item.channel)}` : getPublishActionLabel(item.channel);
          const style = `text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${publishStyle(item.channel)}`;

          if (intentUrl && isManualPostingChannel(item.channel)) {
            return (
              <>
                <a
                  href={intentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    if (shouldCopyBeforeOpen(item.channel)) {
                      try {
                        navigator.clipboard.writeText(currentBody);
                      } catch {}
                    }
                  }}
                  className={style}
                >
                  {btnLabel}
                </a>
                <button
                  onClick={() => {
                    const provided = window.prompt(getManualUrlLabel(item.channel), "") || "";
                    markPublished(provided || null);
                  }}
                  className="text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  {getManualCompleteLabel(item.channel)}
                </button>
              </>
            );
          }

          return (
            <button
              onClick={async () => {
                setLoading("publish");
                try {
                  const res = await fetch("/api/publish", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      content_item_id: item.id,
                      ...(editing ? { edited_body: editedBody } : {}),
                    }),
                  });
                  if (res.ok) onRemove(item.id);
                  else {
                    const d = await res.json();
                    setError(d.error || "Failed");
                  }
                } catch {
                  setError("Failed");
                } finally {
                  setLoading(null);
                }
              }}
              disabled={!!loading}
              className={`${style} disabled:opacity-50`}
            >
              {loading === "publish" ? "Publishing…" : btnLabel}
            </button>
          );
        })()}

        {hasBody && (
          <button
            onClick={() => setEditing(!editing)}
            className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            {editing ? "Cancel" : "Edit"}
          </button>
        )}

        {hasBody && !editing && <CopyBtn text={body} />}

        <button
          onClick={reject}
          disabled={!!loading}
          className="ml-auto text-xs text-red-400 hover:text-red-600 disabled:opacity-40 transition-colors"
        >
          {loading === "reject" ? "…" : "Reject"}
        </button>
      </div>
    </div>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
      className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export default function QueuePage() {
  const params = useParams<{ id: string }>();
  const siteId = params.id;
  const [items, setItems] = useState<ContentItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/queue?site_id=${siteId}`);
      const data = await res.json();
      setItems(data.items || []);
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    load();
  }, [load]);

  function removeItem(id: string) {
    setItems((prev) => (prev || []).filter((item) => item.id !== id));
  }

  if (loading && !items) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  const total = items?.length || 0;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-600">Queue / Publish</p>
        <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">This is where execution happens</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Strategy tells you what to do. The queue is where you review drafts, make edits, and actually ship.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 text-sm text-gray-600 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
        {loading
          ? "Loading…"
          : total > 0
          ? `${total} item${total !== 1 ? "s" : ""} ready for review or publishing`
          : "Nothing is waiting in the queue right now."}
      </div>

      {total === 0 && !loading && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">
          <p className="font-medium text-gray-900">No drafts are waiting right now.</p>
          <p className="mt-2">
            If you have not generated a plan yet, start there. If you already have a plan, go back and generate starter drafts.
          </p>
          <div className="mt-4 flex flex-wrap gap-4">
            <Link href={`/sites/${siteId}/plan`} className="text-sm font-semibold text-brand-600 hover:underline">
              Open plan →
            </Link>
            <Link href={`/sites/${siteId}/content`} className="text-sm font-semibold text-gray-600 hover:underline">
              Review all content →
            </Link>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {(items || []).map((item) => (
          <InboxCard key={item.id} item={item} onRemove={removeItem} />
        ))}
      </div>
    </div>
  );
}
