"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { SocialStrategyState } from "@/types";
import {
  InstagramStrategy,
  TwitterStrategy,
  LinkedInStrategy,
} from "@/lib/generators/instagram";

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
  type?: string;
  content?: string;
  concept?: string;
  item?: ScheduledContentItem;
}

interface PlatformSection {
  key: string;
  label: string;
  icon: string;
  posts: PlatformPost[];
}

const PLATFORM_CONFIG: Record<string, { label: string; icon: string }> = {
  twitter: { label: "Twitter / X", icon: "𝕏" },
  linkedin: { label: "LinkedIn", icon: "in" },
  instagram: { label: "Instagram", icon: "◎" },
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

function buildSections(strategies: SocialStrategyState, contentItems: ScheduledContentItem[]): PlatformSection[] {
  const today = todayDate();
  const sections: PlatformSection[] = [];

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
  contentItems
    .filter((i) => i.channel === "tweet" || i.channel === "twitter")
    .forEach((item) => {
      const date = new Date(item.scheduled_date);
      date.setHours(0, 0, 0, 0);
      if (date < today) return;
      twitterPosts.push({ kind: "content", date, dateKey: date.toISOString().slice(0, 10), item });
    });
  twitterPosts.sort((a, b) => a.date.getTime() - b.date.getTime());
  if (twitterPosts.length > 0) sections.push({ key: "twitter", label: PLATFORM_CONFIG.twitter.label, icon: PLATFORM_CONFIG.twitter.icon, posts: twitterPosts });

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
  if (linkedinPosts.length > 0) sections.push({ key: "linkedin", label: PLATFORM_CONFIG.linkedin.label, icon: PLATFORM_CONFIG.linkedin.icon, posts: linkedinPosts });

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
  if (instagramPosts.length > 0) sections.push({ key: "instagram", label: PLATFORM_CONFIG.instagram.label, icon: PLATFORM_CONFIG.instagram.icon, posts: instagramPosts });

  const otherItems = contentItems.filter((i) => !["tweet", "twitter", "linkedin", "instagram", "blog"].includes(i.channel));
  if (otherItems.length > 0) {
    const otherPosts: PlatformPost[] = otherItems
      .map((item) => {
        const date = new Date(item.scheduled_date);
        date.setHours(0, 0, 0, 0);
        return { kind: "content" as const, date, dateKey: date.toISOString().slice(0, 10), item };
      })
      .filter((p) => p.date >= today)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    if (otherPosts.length > 0) sections.push({ key: "other", label: "Other", icon: "•", posts: otherPosts });
  }

  return sections;
}

function PostRow({
  post,
  done,
  onToggleDone,
  siteId,
}: {
  post: PlatformPost;
  done: boolean;
  onToggleDone?: () => void;
  siteId: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const isContent = post.kind === "content";
  const body = isContent ? (post.item?.body ?? null) : (post.content ?? null);
  const isPublished = post.item?.status === "published";

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
      <div
        className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-16 flex-shrink-0">{formatDate(post.date)}</span>
        <div className="flex-1 min-w-0">
          {body ? <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{body}</p> : <p className="text-xs text-amber-500 italic">Not generated yet</p>}
        </div>
        {post.type && <span className="text-xs text-gray-400 dark:text-gray-500 capitalize hidden sm:block flex-shrink-0">{post.type.replace(/_/g, " ")}</span>}
        <span className="text-xs text-gray-300 dark:text-gray-600 flex-shrink-0">{expanded ? "▲" : "▼"}</span>
      </div>

      {expanded && (
        <div className="px-4 pb-3 space-y-2">
          {post.concept && <p className="text-xs text-gray-400 dark:text-gray-500 italic">{post.concept}</p>}
          {body ? <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-line">{body}</p> : null}

          <div className="flex items-center gap-2 flex-wrap pt-1">
            {body && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(body).catch(() => {});
                }}
                className="text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors"
              >
                Copy
              </button>
            )}

            {isContent ? (
              <Link href={`/sites/${siteId}/queue`} className="text-xs font-semibold text-brand-600 hover:underline">
                Open in Queue →
              </Link>
            ) : (
              <>
                <Link href={`/sites/${siteId}/queue`} className="text-xs font-semibold text-brand-600 hover:underline">
                  Open Queue to post this day →
                </Link>
                {post.doneKey && onToggleDone && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleDone();
                    }}
                    className="text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors"
                  >
                    Mark planned
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionCard({ section, siteId }: { section: PlatformSection; siteId: string }) {
  const [doneSet, setDoneSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`social_done_${siteId}`);
      if (stored) setDoneSet(new Set(JSON.parse(stored)));
    } catch {}
  }, [siteId]);

  function toggleDone(key: string) {
    setDoneSet((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try {
        localStorage.setItem(`social_done_${siteId}`, JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white dark:bg-gray-800 dark:border-gray-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{section.icon}</span>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">{section.label}</h3>
          <span className="text-xs text-gray-400">{section.posts.length}</span>
        </div>
        <Link href={`/sites/${siteId}/queue`} className="text-xs font-semibold text-brand-600 hover:underline">
          Open Queue
        </Link>
      </div>

      <div>
        {section.posts.map((post, idx) => (
          <PostRow
            key={`${section.key}-${post.dateKey}-${idx}`}
            post={post}
            done={!!post.doneKey && doneSet.has(post.doneKey)}
            onToggleDone={post.doneKey ? () => toggleDone(post.doneKey!) : undefined}
            siteId={siteId}
          />
        ))}
      </div>
    </div>
  );
}

interface Props {
  strategies: SocialStrategyState;
  contentItems?: ScheduledContentItem[];
  siteId: string;
}

export function SocialCalendar({ strategies, contentItems = [], siteId }: Props) {
  const sections = buildSections(strategies, contentItems);

  if (sections.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-sm text-gray-500">
        No social schedule yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-brand-100 bg-brand-50/40 p-4 text-sm text-gray-700">
        Calendar is for planning and visibility. Actual posting now lives in Queue.
      </div>
      {sections.map((section) => (
        <SectionCard key={section.key} section={section} siteId={siteId} />
      ))}
    </div>
  );
}
