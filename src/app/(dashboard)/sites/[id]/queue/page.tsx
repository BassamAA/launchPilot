"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { ContentItem } from "@/types";
import { Spinner } from "@/components/ui";

// ─── Platform helpers (same logic as calendar) ────────────────────────────────

function isTwitter(channel: string) {
  return channel === "tweet" || channel === "twitter";
}

function platformIntentUrl(channel: string, text: string): string | null {
  if (isTwitter(channel))
    return `https://x.com/intent/tweet?text=${encodeURIComponent(text.slice(0, 280))}`;
  if (channel === "linkedin") return "https://www.linkedin.com/feed/";
  if (channel === "instagram") return "https://www.instagram.com/";
  return null;
}

function publishLabel(channel: string): string {
  if (isTwitter(channel)) return "𝕏 Post on X";
  if (channel === "linkedin") return "Post on LinkedIn";
  if (channel === "instagram") return "Post on Instagram";
  if (channel === "blog") return "Publish Post";
  return "Publish";
}

function publishStyle(channel: string): string {
  if (isTwitter(channel))
    return "bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100";
  if (channel === "linkedin") return "bg-blue-600 text-white hover:bg-blue-700";
  if (channel === "instagram")
    return "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600";
  return "bg-brand-500 text-white hover:bg-brand-600";
}

const CHANNEL_LABEL: Record<string, string> = {
  tweet: "Tweet", twitter: "Tweet", linkedin: "LinkedIn",
  instagram: "Instagram", blog: "Blog", email: "Email",
  reddit: "Reddit", directory: "Directory",
};

// ─── Inline item card ─────────────────────────────────────────────────────────

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
  const label = CHANNEL_LABEL[item.channel] ?? item.channel;

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
      // Refetch the item body
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

  function markPublished() {
    const finalBody = editing ? editedBody : body;
    fetch("/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content_item_id: item.id,
        intent: true,
        ...(editing && editedBody !== body ? { edited_body: editedBody } : {}),
      }),
    }).catch(() => {});
    onRemove(item.id);
    if (editing && editedBody !== body) setBody(editedBody);
    setEditing(false);
    return finalBody;
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
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2 flex-wrap">
        <span className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500 tracking-wide">
          {label}
        </span>
        {item.title && (
          <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">{item.title}</span>
        )}
        {!hasBody && (
          <span className="text-xs text-gray-400 italic">Not generated</span>
        )}
      </div>

      {/* Body */}
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

      {error && (
        <p className="px-4 pb-2 text-xs text-red-500">{error}</p>
      )}

      {/* Actions */}
      <div className="border-t border-gray-50 dark:border-gray-700/50 px-4 py-2.5 flex items-center gap-2 flex-wrap">
        {/* Generate */}
        {!hasBody && (
          <button
            onClick={generate}
            disabled={!!loading}
            className="text-xs font-semibold bg-brand-500 text-white px-3 py-1.5 rounded-lg hover:bg-brand-600 disabled:opacity-50 transition-colors"
          >
            {loading === "generate" ? "Generating…" : "Generate"}
          </button>
        )}

        {/* Publish */}
        {hasBody && (() => {
          const currentBody = editing ? editedBody : body;
          const intentUrl = platformIntentUrl(item.channel, currentBody);
          const btnLabel = editing ? `Save & ${publishLabel(item.channel)}` : publishLabel(item.channel);
          const style = `text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${publishStyle(item.channel)}`;

          if (intentUrl) {
            return (
              <a
                href={intentUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  if (!isTwitter(item.channel)) {
                    try { navigator.clipboard.writeText(currentBody); } catch {}
                  }
                  markPublished();
                }}
                className={style}
              >
                {btnLabel}
              </a>
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
                } catch { setError("Failed"); }
                finally { setLoading(null); }
              }}
              disabled={!!loading}
              className={`${style} disabled:opacity-50`}
            >
              {loading === "publish" ? "Publishing…" : btnLabel}
            </button>
          );
        })()}

        {/* Edit */}
        {hasBody && (
          <button
            onClick={() => setEditing(!editing)}
            className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            {editing ? "Cancel" : "Edit"}
          </button>
        )}

        {/* Copy */}
        {hasBody && !editing && (
          <CopyBtn text={body} />
        )}

        {/* Reject */}
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
      className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function QueuePage() {
  const params = useParams();
  const siteId = params.id as string;

  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sites/${siteId}/queue?status=draft&limit=50&exclude_channel=blog`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setTotal(data.total || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setTotal((prev) => prev - 1);
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inbox</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {loading ? "Loading…" : total > 0 ? `${total} item${total !== 1 ? "s" : ""} to publish` : "All clear — nothing left to publish"}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 py-16 text-center">
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">You&apos;re all caught up</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            New content will appear here when your plan generates it
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <InboxCard key={item.id} item={item} onRemove={removeItem} />
          ))}
        </div>
      )}
    </div>
  );
}
