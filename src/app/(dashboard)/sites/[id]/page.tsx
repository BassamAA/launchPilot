import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getUser, getSupabaseServerClient } from "@/lib/supabase";
import { Site } from "@/types";
import { PresencePanel } from "@/components/dashboard/PresencePanel";

export default async function SiteDashboardPage({ params }: { params: { id: string } }) {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = getSupabaseServerClient();

  const [{ data: site }, { data: connections }, { data: todayItems }] = await Promise.all([
    supabase
      .from("sites")
      .select("id, name, url, status, brief_json")
      .eq("id", params.id)
      .single(),
    supabase
      .from("platform_connections")
      .select("platform, account_name, account_id, connected_at")
      .eq("site_id", params.id),
    supabase
      .from("content_items")
      .select("id, channel, title, body, status, scheduled_date")
      .eq("site_id", params.id)
      .gte("scheduled_date", new Date().toISOString().split("T")[0])
      .lte("scheduled_date", new Date().toISOString().split("T")[0] + "T23:59:59")
      .not("status", "in", '("published","rejected")')
      .neq("channel", "blog")
      .order("scheduled_date", { ascending: true }),
  ]);

  if (!site) notFound();

  return (
    <div className="max-w-2xl space-y-10">
      {/* Site header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{(site as Site).name}</h1>
        <a
          href={(site as Site).url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-gray-400 hover:text-brand-600 transition-colors"
        >
          {(site as Site).url} ↗
        </a>
      </div>

      {/* Today's posts */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
          Post today
        </h2>
        <TodayPosts items={todayItems ?? []} siteId={params.id} />
      </section>

      {/* Presence & profile health */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
          Your presence
        </h2>
        <PresencePanel
          siteId={params.id}
          siteUrl={(site as Site).url}
          connections={(connections ?? []) as { platform: string; account_name: string | null; account_id: string | null; connected_at: string | null }[]}
        />
      </section>
    </div>
  );
}

// ─── Today's posts (server-rendered, no JS needed) ────────────────────────────

const PLATFORM_INTENT: Record<string, (body: string) => string> = {
  tweet: (b) => `https://x.com/intent/tweet?text=${encodeURIComponent(b.slice(0, 280))}`,
  twitter: (b) => `https://x.com/intent/tweet?text=${encodeURIComponent(b.slice(0, 280))}`,
  linkedin: () => "https://www.linkedin.com/feed/",
  instagram: () => "https://www.instagram.com/",
};

const PLATFORM_LABEL: Record<string, string> = {
  tweet: "𝕏 Post on X",
  twitter: "𝕏 Post on X",
  linkedin: "Post on LinkedIn",
  instagram: "Post on Instagram",
};

const PLATFORM_STYLE: Record<string, string> = {
  tweet: "bg-gray-900 text-white hover:bg-gray-700",
  twitter: "bg-gray-900 text-white hover:bg-gray-700",
  linkedin: "bg-blue-600 text-white hover:bg-blue-700",
  instagram: "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
};

const CHANNEL_BADGE: Record<string, string> = {
  tweet: "Tweet", twitter: "Tweet", linkedin: "LinkedIn",
  instagram: "Instagram", email: "Email", reddit: "Reddit",
};

function TodayPosts({
  items,
  siteId,
}: {
  items: { id: string; channel: string; title: string | null; body: string | null; status: string; scheduled_date: string | null }[];
  siteId: string;
}) {
  if (items.length === 0) {
    return (
      <Link
        href={`/sites/${siteId}/social`}
        className="flex items-center justify-between rounded-xl border border-dashed border-gray-200 dark:border-gray-700 px-4 py-4 text-gray-400 hover:border-brand-300 hover:text-brand-600 transition-colors group"
      >
        <span className="text-sm font-medium">Nothing scheduled today — open your calendar</span>
        <span className="text-xs group-hover:translate-x-0.5 transition-transform">→</span>
      </Link>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const intentFn = PLATFORM_INTENT[item.channel] as ((b: string) => string) | undefined;
        const url = intentFn != null && item.body ? intentFn(item.body) : null;
        const label = PLATFORM_LABEL[item.channel];
        const style = PLATFORM_STYLE[item.channel] ?? "bg-brand-500 text-white hover:bg-brand-600";
        const badge = CHANNEL_BADGE[item.channel] ?? item.channel;

        return (
          <div
            key={item.id}
            className="flex items-start gap-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3"
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">{badge}</p>
              {item.title && (
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{item.title}</p>
              )}
              {item.body && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">
                  {item.body}
                </p>
              )}
              {!item.body && (
                <p className="text-xs text-amber-500 mt-0.5">Not generated yet</p>
              )}
            </div>
            <div className="flex-shrink-0 pt-0.5">
              {!item.body ? (
                <Link
                  href={`/sites/${siteId}/social`}
                  className="text-xs font-semibold bg-brand-500 text-white px-3 py-1.5 rounded-lg hover:bg-brand-600 transition-colors whitespace-nowrap"
                >
                  Generate →
                </Link>
              ) : url && label ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${style}`}
                >
                  {label}
                </a>
              ) : (
                <Link
                  href={`/sites/${siteId}/social`}
                  className="text-xs font-medium text-brand-600 hover:underline whitespace-nowrap"
                >
                  View →
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
