"use client";

import { useState, useEffect } from "react";
import { SocialStrategyState } from "@/types";
import {
  InstagramStrategy,
  TwitterStrategy,
  LinkedInStrategy,
} from "@/lib/generators/instagram";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScheduledContentItem {
  id: string;
  channel: string;
  title: string | null;
  body: string | null;
  status: string;
  scheduled_date: string;
}

const PLATFORM_META = {
  instagram: { label: "Instagram", emoji: "📸", colorClass: "bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800" },
  twitter: { label: "Twitter / X", emoji: "𝕏", colorClass: "bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600" },
  linkedin: { label: "LinkedIn", emoji: "in", colorClass: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800" },
};

const CHANNEL_META: Record<string, { label: string; colorClass: string }> = {
  tweet: { label: "Tweet", colorClass: "bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800" },
  blog: { label: "Blog Post", colorClass: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" },
  linkedin: { label: "LinkedIn", colorClass: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800" },
  email: { label: "Email", colorClass: "bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800" },
  reddit: { label: "Reddit", colorClass: "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800" },
  directory: { label: "Directory", colorClass: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800" },
};

const LINKEDIN_DAYS = [1, 3, 5, 8, 10, 12, 15, 17, 19, 22, 24, 26, 29];

// ─── Calendar entry types ─────────────────────────────────────────────────────

interface StrategyEntry {
  kind: "strategy";
  day: number;
  date: Date;
  dateKey: string;
  platform: keyof typeof PLATFORM_META;
  time: string;
  type: string;
  content: string;
  concept?: string;
  doneKey: string;
}

interface ContentEntry {
  kind: "content";
  date: Date;
  dateKey: string;
  item: ScheduledContentItem;
  siteId: string;
}

type CalendarEntry = StrategyEntry | ContentEntry;

// ─── Build calendar entries ───────────────────────────────────────────────────

function buildEntries(
  strategies: SocialStrategyState,
  contentItems: ScheduledContentItem[],
  siteId: string
): CalendarEntry[] {
  const entries: CalendarEntry[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function dayToDate(day: number) {
    const d = new Date(today);
    d.setDate(today.getDate() + day - 1);
    return d;
  }

  if (strategies.instagram) {
    const ig = strategies.instagram.strategy_json as InstagramStrategy;
    const times = ig.best_posting_times ?? [];
    ig.thirty_day_calendar.forEach((item, i) => {
      const date = dayToDate(item.day);
      const dateKey = date.toISOString().slice(0, 10);
      entries.push({ kind: "strategy", day: item.day, date, dateKey, platform: "instagram", time: times.length ? times[i % times.length] : "Evening", type: item.format, content: item.caption_draft, concept: item.concept, doneKey: `${dateKey}-instagram` });
    });
  }

  if (strategies.twitter) {
    const tw = strategies.twitter.strategy_json as TwitterStrategy;
    tw.thirty_day_calendar.forEach((item) => {
      const date = dayToDate(item.day);
      const dateKey = date.toISOString().slice(0, 10);
      entries.push({ kind: "strategy", day: item.day, date, dateKey, platform: "twitter", time: item.best_time ?? "8am", type: item.type, content: item.draft, concept: item.concept, doneKey: `${dateKey}-twitter` });
    });
  }

  if (strategies.linkedin) {
    const li = strategies.linkedin.strategy_json as LinkedInStrategy;
    const ideas = li.post_ideas ?? [];
    if (ideas.length > 0) {
      LINKEDIN_DAYS.forEach((dayNum, i) => {
        const idea = ideas[i % ideas.length];
        const date = dayToDate(dayNum);
        const dateKey = date.toISOString().slice(0, 10);
        entries.push({ kind: "strategy", day: dayNum, date, dateKey, platform: "linkedin", time: "9:00 AM", type: idea.format, content: idea.hook, concept: idea.body_outline, doneKey: `${dateKey}-linkedin` });
      });
    }
  }

  for (const item of contentItems) {
    if (!item.scheduled_date || item.status === "rejected") continue;
    const date = new Date(item.scheduled_date);
    date.setHours(0, 0, 0, 0);
    const dateKey = date.toISOString().slice(0, 10);
    entries.push({ kind: "content", date, dateKey, item, siteId });
  }

  const platformOrder: Record<string, number> = { instagram: 0, twitter: 1, linkedin: 2 };
  return entries.sort((a, b) => {
    const diff = a.date.getTime() - b.date.getTime();
    if (diff !== 0) return diff;
    if (a.kind === "strategy" && b.kind === "strategy") return (platformOrder[a.platform] ?? 9) - (platformOrder[b.platform] ?? 9);
    return a.kind === "content" ? 1 : -1;
  });
}

function groupByDate(entries: CalendarEntry[]) {
  const map = new Map<string, { date: Date; entries: CalendarEntry[] }>();
  for (const e of entries) {
    if (!map.has(e.dateKey)) map.set(e.dateKey, { date: e.date, entries: [] });
    map.get(e.dateKey)!.entries.push(e);
  }
  return Array.from(map.values());
}

function formatDay(date: Date) {
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

// ─── Strategy card (manual posting) ──────────────────────────────────────────

function StrategyCard({
  entry,
  done,
  onToggleDone,
}: {
  entry: StrategyEntry;
  done: boolean;
  onToggleDone: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const meta = PLATFORM_META[entry.platform];

  function copy() {
    navigator.clipboard.writeText(entry.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function tweet() {
    const url = `https://x.com/intent/tweet?text=${encodeURIComponent(entry.content.slice(0, 280))}`;
    window.open(url, "_blank");
    onToggleDone();
  }

  return (
    <div className={`rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 transition-opacity ${done ? "opacity-40" : ""}`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2 flex-wrap">
        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.colorClass}`}>
          <span className="font-bold">{meta.emoji}</span> {meta.label}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">{entry.time}</span>
        <span className="ml-auto rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs font-medium text-gray-500 dark:text-gray-400 capitalize">
          {entry.type.replace(/_/g, " ")}
        </span>
      </div>

      {entry.concept && (
        <p className="px-4 pb-1 text-xs text-gray-400 dark:text-gray-500 italic">{entry.concept}</p>
      )}

      <p className={`px-4 pb-3 text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-line ${done ? "line-through" : ""}`}>
        {entry.content}
      </p>

      <div className="border-t border-gray-50 dark:border-gray-700/50 px-4 py-2 flex items-center gap-3 flex-wrap">
        {/* Open in platform — for twitter always show, for others show if connected */}
        {entry.platform === "twitter" && !done && (
          <button
            onClick={tweet}
            className="text-xs font-semibold bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors"
          >
            𝕏 Open in X
          </button>
        )}

        {!done && (
          <button onClick={copy} className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline">
            {copied ? "Copied!" : "Copy"}
          </button>
        )}

        <button
          onClick={onToggleDone}
          className={`text-xs font-medium transition-colors ${done ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400"}`}
        >
          {done ? "✓ Posted" : "Mark as posted"}
        </button>
      </div>
    </div>
  );
}

// ─── Platform intent helpers ──────────────────────────────────────────────────

function platformIntentUrl(channel: string, text: string): string | null {
  if (channel === "tweet") return `https://x.com/intent/tweet?text=${encodeURIComponent(text.slice(0, 280))}`;
  if (channel === "linkedin") return `https://www.linkedin.com/feed/`;
  if (channel === "instagram") return `https://www.instagram.com/`;
  return null;
}

function publishLabel(channel: string): string {
  if (channel === "tweet") return "𝕏 Open in X";
  if (channel === "linkedin") return "Post on LinkedIn";
  if (channel === "instagram") return "Post on Instagram";
  if (channel === "blog") return "Publish Post";
  return "Publish";
}

function publishStyle(channel: string): string {
  if (channel === "tweet") return "bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100";
  if (channel === "linkedin") return "bg-blue-600 text-white hover:bg-blue-700";
  if (channel === "instagram") return "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600";
  return "bg-brand-500 text-white hover:bg-brand-600";
}

function ContentCard({ initItem, siteId }: { initItem: ScheduledContentItem; siteId: string }) {
  const [item, setItem] = useState(initItem);
  const [editing, setEditing] = useState(false);
  const [editedBody, setEditedBody] = useState(initItem.body ?? "");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);

  if (hidden) return null;

  const isPublished = item.status === "published";
  const hasBody = !!item.body;
  const meta = CHANNEL_META[item.channel] ?? { label: item.channel, colorClass: "bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600" };

  async function callApi(endpoint: string, body: Record<string, unknown>): Promise<{ ok: boolean; data: Record<string, unknown> }> {
    setError(null);
    setLoading(endpoint);
    try {
      const res = await fetch(`/api/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      // needs_connection → redirect to settings
      if (res.status === 409 && data.redirect_url) {
        window.location.href = data.redirect_url;
        return { ok: false, data };
      }
      if (!res.ok) throw new Error(data.error || "Failed");
      return { ok: true, data };
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      return { ok: false, data: {} };
    } finally {
      setLoading(null);
    }
  }

  async function refetch() {
    try {
      const res = await fetch(`/api/content-item?id=${item.id}`);
      if (res.ok) {
        const updated = await res.json();
        setItem(updated);
        setEditedBody(updated.body ?? "");
      }
    } catch {}
  }

  async function generate() {
    const { ok } = await callApi("generate-content", { content_item_id: item.id });
    if (ok) await refetch();
  }

  async function publish() {
    const currentBody = (editing && editedBody !== item.body ? editedBody : item.body) ?? "";
    const intentUrl = platformIntentUrl(item.channel, currentBody);

    // Open the platform in a new tab (with text pre-filled where possible)
    if (intentUrl) {
      // For LinkedIn/Instagram, copy text first so user can paste
      if (item.channel !== "tweet") {
        try { navigator.clipboard.writeText(currentBody); } catch {}
      }
      window.open(intentUrl, "_blank");
    }

    // Mark as published in the DB
    const body: Record<string, unknown> = { content_item_id: item.id, intent: true };
    if (editing && editedBody !== item.body) body.edited_body = editedBody;
    const { ok } = await callApi("publish", body);
    if (ok) {
      setEditing(false);
      setItem((prev) => ({
        ...prev,
        status: "published",
        body: (body.edited_body as string | undefined) ?? prev.body,
      }));
    }
  }

  async function reject() {
    const { ok } = await callApi("reject", { content_item_id: item.id });
    if (ok) setHidden(true);
  }

  return (
    <div className={`rounded-xl border bg-white dark:bg-gray-800 transition-all ${
      isPublished
        ? "border-emerald-200 dark:border-emerald-800"
        : "border-gray-100 dark:border-gray-700"
    }`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2 flex-wrap">
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.colorClass}`}>
          {meta.label}
        </span>
        {isPublished && (
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">✓ Published</span>
        )}
        {!isPublished && !hasBody && (
          <span className="text-xs text-gray-400 dark:text-gray-500">Not generated</span>
        )}
        {item.title && (
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate flex-1">{item.title}</span>
        )}
      </div>

      {/* Body — read mode */}
      {hasBody && !editing && (
        <div className="px-4 pb-3">
          <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-line">
            {item.body}
          </p>
        </div>
      )}

      {/* Body — edit mode */}
      {editing && (
        <div className="px-4 pb-3">
          <textarea
            value={editedBody}
            onChange={(e) => setEditedBody(e.target.value)}
            rows={6}
            autoFocus
            className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-brand-300 dark:focus:ring-brand-600 leading-relaxed"
          />
        </div>
      )}

      {error && (
        <p className="px-4 pb-2 text-xs text-red-500 dark:text-red-400">{error}</p>
      )}

      {/* Actions */}
      <div className="border-t border-gray-50 dark:border-gray-700/50 px-4 py-2.5 flex items-center gap-2 flex-wrap">
        {/* Generate if no body */}
        {!hasBody && !isPublished && (
          <button
            onClick={generate}
            disabled={!!loading}
            className="text-xs font-semibold bg-brand-500 text-white px-3 py-1.5 rounded-lg hover:bg-brand-600 disabled:opacity-50 transition-colors"
          >
            {loading === "generate-content" ? "Generating…" : "Generate"}
          </button>
        )}

        {/* Publish — always shown when there's body and not published */}
        {hasBody && !isPublished && (
          <button
            onClick={publish}
            disabled={!!loading}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors ${publishStyle(item.channel)}`}
          >
            {loading === "publish"
              ? "Publishing…"
              : editing
              ? `Save & ${publishLabel(item.channel)}`
              : publishLabel(item.channel)}
          </button>
        )}

        {/* Edit toggle */}
        {hasBody && !isPublished && (
          <button
            onClick={() => { setEditing(!editing); }}
            className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            {editing ? "Cancel" : "Edit"}
          </button>
        )}

        {/* Copy */}
        {hasBody && !editing && (
          <CopyBtn text={item.body!} />
        )}

        {/* Reject */}
        {!isPublished && (
          <button
            onClick={reject}
            disabled={!!loading}
            className="ml-auto text-xs text-red-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-40 transition-colors"
          >
            {loading === "reject" ? "…" : "Reject"}
          </button>
        )}
      </div>
    </div>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
      className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  strategies: SocialStrategyState;
  contentItems?: ScheduledContentItem[];
  siteId: string;
  connectedPlatforms?: string[];
}

export function SocialCalendar({ strategies, contentItems = [], siteId, connectedPlatforms = [] }: Props) {
  const twitterConnected = connectedPlatforms.includes("twitter");
  const [showAll, setShowAll] = useState(false);
  const [doneDays, setDoneDays] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`social_done_${siteId}`);
      if (stored) setDoneDays(new Set(JSON.parse(stored) as string[]));
    } catch {}
  }, [siteId]);

  function toggleDone(key: string) {
    setDoneDays((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      try { localStorage.setItem(`social_done_${siteId}`, JSON.stringify(Array.from(next))); } catch {}
      return next;
    });
  }

  const allEntries = buildEntries(strategies, contentItems, siteId);
  const grouped = groupByDate(allEntries);
  const visible = showAll ? grouped : grouped.slice(0, 7);

  if (allEntries.length === 0) return null;

  return (
    <div className="space-y-8">
      {visible.map(({ date, entries }, gi) => {
        const stratEntries = entries.filter((e): e is StrategyEntry => e.kind === "strategy");
        const doneCount = stratEntries.filter((e) => doneDays.has(e.doneKey)).length;

        return (
          <div key={gi}>
            <div className="flex items-center gap-3 mb-4">
              <p className="text-sm font-bold text-gray-900 dark:text-white">{formatDay(date)}</p>
              <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700" />
              {stratEntries.length > 0 && doneCount > 0 && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  {doneCount}/{stratEntries.length} posted
                </span>
              )}
            </div>

            <div className="space-y-3">
              {entries.map((entry, i) =>
                entry.kind === "strategy" ? (
                  <StrategyCard
                    key={i}
                    entry={entry}
                    done={doneDays.has(entry.doneKey)}
                    onToggleDone={() => toggleDone(entry.doneKey)}
                  />
                ) : (
                  <ContentCard key={entry.item.id} initItem={entry.item} siteId={siteId} />
                )
              )}
            </div>
          </div>
        );
      })}

      {grouped.length > 7 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full rounded-xl border border-dashed border-gray-200 dark:border-gray-700 py-3 text-sm font-medium text-gray-400 dark:text-gray-500 hover:text-brand-600 dark:hover:text-brand-400 hover:border-brand-300 transition-colors"
        >
          {showAll ? "Show less" : `Show all ${grouped.length} days`}
        </button>
      )}
    </div>
  );
}
