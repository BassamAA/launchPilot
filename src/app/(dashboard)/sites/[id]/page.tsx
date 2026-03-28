import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getUser, getSupabaseServerClient } from "@/lib/supabase";
import { Site, ContentItem } from "@/types";
import { ArrowRightIcon, CalendarDaysIcon, LinkIcon } from "@heroicons/react/24/outline";

function platformUrl(channel: string, body: string): string | null {
  if (channel === "tweet" || channel === "twitter")
    return `https://x.com/intent/tweet?text=${encodeURIComponent((body || "").slice(0, 280))}`;
  if (channel === "linkedin") return "https://www.linkedin.com/feed/";
  if (channel === "instagram") return "https://www.instagram.com/";
  return null;
}

function platformLabel(channel: string): string {
  if (channel === "tweet" || channel === "twitter") return "𝕏 Post on X";
  if (channel === "linkedin") return "Post on LinkedIn";
  if (channel === "instagram") return "Post on Instagram";
  if (channel === "blog") return "Publish post";
  return "Publish";
}

function platformStyle(channel: string): string {
  if (channel === "tweet" || channel === "twitter")
    return "bg-gray-900 text-white hover:bg-gray-700";
  if (channel === "linkedin") return "bg-blue-600 text-white hover:bg-blue-700";
  if (channel === "instagram")
    return "bg-gradient-to-r from-purple-500 to-pink-500 text-white";
  return "bg-brand-500 text-white hover:bg-brand-600";
}

const CHANNEL_LABEL: Record<string, string> = {
  tweet: "Tweet", twitter: "Tweet", linkedin: "LinkedIn",
  instagram: "Instagram", blog: "Blog", email: "Email",
  reddit: "Reddit", directory: "Directory",
};

export default async function SiteDashboardPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = getSupabaseServerClient();
  const { data: site } = await supabase
    .from("sites")
    .select("id, name, url, status, brief_json, social_strategy_json")
    .eq("id", params.id)
    .single();

  if (!site) notFound();
  const siteObj = site as Site;

  const today = new Date().toISOString().split("T")[0];
  const todayEnd = today + "T23:59:59";

  const [{ data: todayItems }, { data: upcomingItems }, { data: allPublished }, { data: connections }] =
    await Promise.all([
      // Today's scheduled items not yet published
      supabase
        .from("content_items")
        .select("id, channel, title, body, status, scheduled_date")
        .eq("site_id", params.id)
        .gte("scheduled_date", today)
        .lte("scheduled_date", todayEnd)
        .not("status", "in", '("published","rejected")')
        .order("scheduled_date", { ascending: true }),
      // Next 5 upcoming (after today)
      supabase
        .from("content_items")
        .select("id, channel, title, scheduled_date")
        .eq("site_id", params.id)
        .gt("scheduled_date", todayEnd)
        .not("status", "in", '("published","rejected")')
        .order("scheduled_date", { ascending: true })
        .limit(5),
      // Total published count
      supabase
        .from("content_items")
        .select("id", { count: "exact", head: true })
        .eq("site_id", params.id)
        .eq("status", "published"),
      // Connected platforms
      supabase
        .from("platform_connections")
        .select("platform")
        .eq("site_id", params.id),
    ]);

  const hasConnections = (connections ?? []).length > 0;
  const hasBrief = !!siteObj.brief_json;
  const publishedCount = (allPublished as unknown as { count: number } | null)?.count ?? 0;
  const today_list = (todayItems ?? []) as Pick<ContentItem, "id" | "channel" | "title" | "body" | "status" | "scheduled_date">[];
  const upcoming_list = (upcomingItems ?? []) as Pick<ContentItem, "id" | "channel" | "title" | "scheduled_date">[];

  return (
    <div className="max-w-2xl space-y-8">
      {/* Site header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{siteObj.name}</h1>
        <a
          href={siteObj.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-gray-400 hover:text-brand-600 transition-colors"
        >
          {siteObj.url} ↗
        </a>
      </div>

      {/* Setup nudges — only shown when missing */}
      {(!hasBrief || !hasConnections) && (
        <div className="space-y-2">
          {!hasBrief && (
            <Link
              href={`/sites/${params.id}/social`}
              className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800 px-4 py-3 hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors"
            >
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Generate your posting calendar</p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">Tell us about your business to get a 30-day social plan</p>
              </div>
              <ArrowRightIcon className="w-4 h-4 text-amber-500 flex-shrink-0" />
            </Link>
          )}
          {!hasConnections && (
            <Link
              href={`/sites/${params.id}/settings`}
              className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <LinkIcon className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Connect your social accounts</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Twitter/X, LinkedIn, Instagram</p>
                </div>
              </div>
              <ArrowRightIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </Link>
          )}
        </div>
      )}

      {/* TODAY */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">Today</h2>
          {publishedCount > 0 && (
            <span className="text-xs text-gray-400 dark:text-gray-500">{publishedCount} published total</span>
          )}
        </div>

        {today_list.length === 0 ? (
          <Link
            href={`/sites/${params.id}/social`}
            className="flex items-center justify-between rounded-xl border border-dashed border-gray-200 dark:border-gray-700 px-4 py-5 text-gray-400 dark:text-gray-500 hover:border-brand-300 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
          >
            <div className="flex items-center gap-3">
              <CalendarDaysIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Nothing scheduled today — open your calendar</span>
            </div>
            <ArrowRightIcon className="w-4 h-4 flex-shrink-0" />
          </Link>
        ) : (
          <div className="space-y-3">
            {today_list.map((item) => {
              const url = item.body ? platformUrl(item.channel, item.body) : null;
              const label = CHANNEL_LABEL[item.channel] ?? item.channel;
              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase mb-1">{label}</p>
                      {item.title && (
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{item.title}</p>
                      )}
                      {item.body && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                          {item.body}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      {!item.body ? (
                        <Link
                          href={`/sites/${params.id}/social`}
                          className="text-xs font-semibold bg-brand-500 text-white px-3 py-1.5 rounded-lg hover:bg-brand-600 transition-colors whitespace-nowrap"
                        >
                          Generate
                        </Link>
                      ) : url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${platformStyle(item.channel)}`}
                        >
                          {platformLabel(item.channel)}
                        </a>
                      ) : (
                        <Link
                          href={`/sites/${params.id}/social`}
                          className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline whitespace-nowrap"
                        >
                          View →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* COMING UP */}
      {upcoming_list.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide mb-3">Coming up</h2>
          <div className="space-y-2">
            {upcoming_list.map((item) => {
              const date = new Date(item.scheduled_date!);
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800"
                >
                  <span className="text-xs text-gray-400 dark:text-gray-500 w-16 flex-shrink-0">
                    {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                  <span className="text-xs font-semibold text-gray-400 uppercase w-16 flex-shrink-0">
                    {CHANNEL_LABEL[item.channel] ?? item.channel}
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">
                    {item.title ?? "—"}
                  </span>
                </div>
              );
            })}
          </div>
          <Link
            href={`/sites/${params.id}/social`}
            className="mt-3 flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 hover:underline"
          >
            See full calendar <ArrowRightIcon className="w-3 h-3" />
          </Link>
        </section>
      )}
    </div>
  );
}
