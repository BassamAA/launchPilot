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

interface PlatformPost {
  kind: "strategy" | "content";
  date: Date;
  dateKey: string;
  doneKey?: string;
  // strategy
  type?: string;
  content?: string;
  concept?: string;
  // content item
  item?: ScheduledContentItem;
}

interface PlatformSection {
  key: string;
  label: string;
  icon: string;
  intentUrl: (text: string) => string | null;
  posts: PlatformPost[];
}

// ─── Platform config ──────────────────────────────────────────────────────────

const PLATFORM_CONFIG: Record<string, { label: string; icon: string; intentUrl: (t: string) => string | null }> = {
  twitter: {
    label: "Twitter / X",
    icon: "𝕏",
    intentUrl: (t) => `https://x.com/intent/tweet?text=${encodeURIComponent(t.slice(0, 280))}`,
  },
  linkedin: {
    label: "LinkedIn",
    icon: "in",
    intentUrl: () => "https://www.linkedin.com/feed/",
  },
  instagram: {
    label: "Instagram",
    icon: "◎",
    intentUrl: () => "https://www.instagram.com/",
  },
};

const LINKEDIN_DAYS = [1, 3, 5, 8, 10, 12, 15, 17, 19, 22, 24, 26, 29];

function todayDate() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function dayToDate(day: number): Date {
  const d = todayDate();
  d.setDate(d.getDate() + day - 1);
  return d;
}

function formatDate(date: Date): string {
  const today = todayDate();
  const diff = Math.round((date.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Build platform sections ──────────────────────────────────────────────────

function buildSections(
  strategies: SocialStrategyState,
  contentItems: ScheduledContentItem[],
  siteId: string
): PlatformSection[] {
  const today = todayDate();
  const sections: PlatformSection[] = [];

  // Twitter strategy posts
  const twitterPosts: PlatformPost[] = [];
  if (strategies.twitter) {
    const tw = strategies.twitter.strategy_json as TwitterStrategy;
    tw.thirty_day_calendar.forEach((item) => {
      const date = dayToDate(item.day);
      if (date < today) return;
      twitterPosts.push({
        kind: "strategy",
        date,
        dateKey: date.toISOString().slice(0, 10),
        doneKey: `${date.toISOString().slice(0, 10)}-twitter`,
        type: item.type,
        content: item.draft,
        concept: item.concept,
      });
    });
  }

  // Twitter content items (channel: tweet or twitter)
  contentItems
    .filter((i) => i.channel === "tweet" || i.channel === "twitter")
    .forEach((item) => {
      const date = new Date(item.scheduled_date);
      date.setHours(0, 0, 0, 0);
      if (date < today) return;
      twitterPosts.push({
        kind: "content",
        date,
        dateKey: date.toISOString().slice(0, 10),
        item,
      });
    });

  twitterPosts.sort((a, b) => a.date.getTime() - b.date.getTime());
  if (twitterPosts.length > 0) {
    sections.push({ key: "twitter", label: "Twitter / X", icon: "𝕏", intentUrl: PLATFORM_CONFIG.twitter.intentUrl, posts: twitterPosts });
  }

  // LinkedIn strategy posts
  const linkedinPosts: PlatformPost[] = [];
  if (strategies.linkedin) {
    const li = strategies.linkedin.strategy_json as LinkedInStrategy;
    const ideas = li.post_ideas ?? [];
    if (ideas.length > 0) {
      LINKEDIN_DAYS.forEach((dayNum, i) => {
        const date = dayToDate(dayNum);
        if (date < today) return;
        const idea = ideas[i % ideas.length];
        linkedinPosts.push({
          kind: "strategy",
          date,
          dateKey: date.toISOString().slice(0, 10),
          doneKey: `${date.toISOString().slice(0, 10)}-linkedin`,
          type: idea.format,
          content: idea.hook,
          concept: idea.body_outline,
        });
      });
    }
  }

  contentItems
    .filter((i) => i.channel === "linkedin")
    .forEach((item) => {
      const date = new Date(item.scheduled_date);
      date.setHours(0, 0, 0, 0);
      if (date < today) return;
      linkedinPosts.push({ kind: "content", date, dateKey: date.toISOString().slice(0, 10), item });
    });

  linkedinPosts.sort((a, b) => a.date.getTime() - b.date.getTime());
  if (linkedinPosts.length > 0) {
    sections.push({ key: "linkedin", label: "LinkedIn", icon: "in", intentUrl: PLATFORM_CONFIG.linkedin.intentUrl, posts: linkedinPosts });
  }

  // Instagram strategy posts
  const instagramPosts: PlatformPost[] = [];
  if (strategies.instagram) {
    const ig = strategies.instagram.strategy_json as InstagramStrategy;
    ig.thirty_day_calendar.forEach((item) => {
      const date = dayToDate(item.day);
      if (date < today) return;
      instagramPosts.push({
        kind: "strategy",
        date,
        dateKey: date.toISOString().slice(0, 10),
        doneKey: `${date.toISOString().slice(0, 10)}-instagram`,
        type: item.format,
        content: item.caption_draft,
        concept: item.concept,
      });
    });
  }

  contentItems
    .filter((i) => i.channel === "instagram")
    .forEach((item) => {
      const date = new Date(item.scheduled_date);
      date.setHours(0, 0, 0, 0);
      if (date < today) return;
      instagramPosts.push({ kind: "content", date, dateKey: date.toISOString().slice(0, 10), item });
    });

  instagramPosts.sort((a, b) => a.date.getTime() - b.date.getTime());
  if (instagramPosts.length > 0) {
    sections.push({ key: "instagram", label: "Instagram", icon: "◎", intentUrl: PLATFORM_CONFIG.instagram.intentUrl, posts: instagramPosts });
  }

  // Other content items (email, reddit, etc.)
  const otherItems = contentItems.filter(
    (i) => !["tweet", "twitter", "linkedin", "instagram", "blog"].includes(i.channel)
  );
  if (otherItems.length > 0) {
    const otherPosts: PlatformPost[] = otherItems
      .map((item) => {
        const date = new Date(item.scheduled_date);
        date.setHours(0, 0, 0, 0);
        return { kind: "content" as const, date, dateKey: date.toISOString().slice(0, 10), item };
      })
      .filter((p) => p.date >= today)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (otherPosts.length > 0) {
      sections.push({ key: "other", label: "Other", icon: "•", intentUrl: () => null, posts: otherPosts });
    }
  }

  return sections;
}

// ─── Post row ─────────────────────────────────────────────────────────────────

function PostRow({
  post,
  done,
  onToggleDone,
  intentUrl,
  siteId,
}: {
  post: PlatformPost;
  done: boolean;
  onToggleDone?: () => void;
  intentUrl: (text: string) => string | null;
  siteId: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [itemState, setItemState] = useState(post.item);
  const [editing, setEditing] = useState(false);
  const [editedBody, setEditedBody] = useState(post.item?.body ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isContent = post.kind === "content";
  const body = isContent ? (itemState?.body ?? null) : (post.content ?? null);
  const isPublished = itemState?.status === "published";
  const text = (editing ? editedBody : body) ?? "";
  const url = text ? intentUrl(text) : null;

  async function generate() {
    if (!itemState) return;
    setLoading(true);
    setError(null);
    try {
      await fetch("/api/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_item_id: itemState.id }),
      });
      const r = await fetch(`/api/content-item?id=${itemState.id}`);
      if (r.ok) {
        const updated = await r.json();
        setItemState(updated);
        setEditedBody(updated.body ?? "");
      }
    } catch { setError("Failed"); }
    finally { setLoading(false); }
  }

  function markPublished() {
    if (!itemState) return;
    fetch("/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content_item_id: itemState.id,
        intent: true,
        ...(editing && editedBody !== itemState.body ? { edited_body: editedBody } : {}),
      }),
    }).catch(() => {});
    setItemState((prev) => prev ? { ...prev, status: "published", body: editing ? editedBody : prev.body } : prev);
    setEditing(false);
  }

  if (isPublished) {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 opacity-50">
        <span className="text-xs text-gray-400 w-16 flex-shrink-0">{formatDate(post.date)}</span>
        <span className="text-xs text-emerald-500 font-semibold">✓ Posted</span>
        {post.type && <span className="text-xs text-gray-400 capitalize hidden sm:block">{post.type.replace(/_/g, " ")}</span>}
      </div>
    );
  }

  return (
    <div className={`border-t border-gray-50 dark:border-gray-700/50 ${done ? "opacity-40" : ""}`}>
      {/* Compact row */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-16 flex-shrink-0">
          {formatDate(post.date)}
        </span>
        <div className="flex-1 min-w-0">
          {body ? (
            <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{body}</p>
          ) : (
            <p className="text-xs text-amber-500 italic">Not generated yet</p>
          )}
        </div>
        {post.type && (
          <span className="text-xs text-gray-400 dark:text-gray-500 capitalize hidden sm:block flex-shrink-0">
            {post.type.replace(/_/g, " ")}
          </span>
        )}
        <span className="text-xs text-gray-300 dark:text-gray-600 flex-shrink-0">
          {expanded ? "▲" : "▼"}
        </span>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-3 space-y-2">
          {post.concept && !editing && (
            <p className="text-xs text-gray-400 dark:text-gray-500 italic">{post.concept}</p>
          )}

          {/* Body / edit */}
          {editing ? (
            <textarea
              value={editedBody}
              onChange={(e) => setEditedBody(e.target.value)}
              rows={5}
              autoFocus
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          ) : body ? (
            <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-line">{body}</p>
          ) : null}

          {error && <p className="text-xs text-red-500">{error}</p>}

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap pt-1" onClick={(e) => e.stopPropagation()}>
            {/* Generate (content item, no body) */}
            {isContent && !body && (
              <button
                onClick={generate}
                disabled={loading}
                className="text-xs font-semibold bg-brand-500 text-white px-3 py-1.5 rounded-lg hover:bg-brand-600 disabled:opacity-50 transition-colors"
              >
                {loading ? "Generating…" : "Generate"}
              </button>
            )}

            {/* Post on platform */}
            {body && url && (
              <a
                href={editing ? (editedBody ? intentUrl(editedBody) ?? url : url) : url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  // For LinkedIn/Instagram: copy text first
                  const currentText = editing ? editedBody : body;
                  if (!url.includes("x.com/intent")) {
                    try { navigator.clipboard.writeText(currentText); } catch {}
                  }
                  if (isContent) markPublished();
                  if (post.doneKey && onToggleDone && !isContent) onToggleDone();
                }}
                className="text-xs font-semibold bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors"
              >
                {editing ? "Save & Post" : "Post →"}
              </a>
            )}

            {/* Copy */}
            {body && <CopyBtn text={editing ? editedBody : body} />}

            {/* Edit (content items only) */}
            {isContent && body && (
              <button
                onClick={() => setEditing(!editing)}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                {editing ? "Cancel" : "Edit"}
              </button>
            )}

            {/* Mark as done (strategy items) */}
            {!isContent && body && onToggleDone && (
              <button
                onClick={onToggleDone}
                className={`text-xs transition-colors ml-auto ${
                  done
                    ? "text-emerald-500 font-medium"
                    : "text-gray-300 dark:text-gray-600 hover:text-emerald-500"
                }`}
              >
                {done ? "✓ Posted" : "Mark posted"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1600); }}
      className="text-xs text-brand-500 hover:underline"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

// ─── Platform section ─────────────────────────────────────────────────────────

function PlatformSection({
  section,
  doneDays,
  onToggleDone,
  siteId,
}: {
  section: PlatformSection;
  doneDays: Set<string>;
  onToggleDone: (key: string) => void;
  siteId: string;
}) {
  const [open, setOpen] = useState(false);
  const doneCount = section.posts.filter((p) => p.doneKey && doneDays.has(p.doneKey)).length;
  const totalCount = section.posts.length;

  const SECTION_STYLE: Record<string, string> = {
    twitter: "border-gray-200 dark:border-gray-600",
    linkedin: "border-blue-200 dark:border-blue-800",
    instagram: "border-pink-200 dark:border-pink-800",
  };
  const ICON_STYLE: Record<string, string> = {
    twitter: "text-gray-900 dark:text-white",
    linkedin: "text-blue-600",
    instagram: "text-pink-500",
  };

  return (
    <div className={`rounded-xl border bg-white dark:bg-gray-800 overflow-hidden ${SECTION_STYLE[section.key] ?? "border-gray-200 dark:border-gray-700"}`}>
      {/* Header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
      >
        <span className={`text-sm font-black w-5 text-center flex-shrink-0 ${ICON_STYLE[section.key] ?? "text-gray-600"}`}>
          {section.icon}
        </span>
        <span className="font-semibold text-gray-900 dark:text-white text-sm">{section.label}</span>
        <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">{totalCount} posts</span>
        {doneCount > 0 && (
          <span className="text-xs font-semibold text-emerald-500 ml-1">{doneCount} posted</span>
        )}
        <span className="ml-auto text-gray-300 dark:text-gray-600 text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {/* Post list */}
      {open && (
        <div>
          {section.posts.map((post, i) => (
            <PostRow
              key={post.item?.id ?? `${section.key}-${i}`}
              post={post}
              done={!!(post.doneKey && doneDays.has(post.doneKey))}
              onToggleDone={post.doneKey ? () => onToggleDone(post.doneKey!) : undefined}
              intentUrl={section.intentUrl}
              siteId={siteId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface Props {
  strategies: SocialStrategyState;
  contentItems?: ScheduledContentItem[];
  siteId: string;
  connectedPlatforms?: string[];
}

export function SocialCalendar({ strategies, contentItems = [], siteId }: Props) {
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

  const sections = buildSections(strategies, contentItems, siteId);
  if (sections.length === 0) return null;

  return (
    <div className="space-y-3">
      {sections.map((section) => (
        <PlatformSection
          key={section.key}
          section={section}
          doneDays={doneDays}
          onToggleDone={toggleDone}
          siteId={siteId}
        />
      ))}
    </div>
  );
}
