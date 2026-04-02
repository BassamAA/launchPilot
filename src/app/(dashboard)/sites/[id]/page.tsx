import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getUser, getSupabaseServerClient } from "@/lib/supabase";
import { Badge, Card } from "@/components/ui";
import { PlatformConnection, Site } from "@/types";
import { PresencePanel } from "@/components/dashboard/PresencePanel";
import { getChannelIntentUrl, getChannelLabel, getPublishActionLabel, isManualPostingChannel } from "@/lib/channel-publishing";

export default async function SiteDashboardPage({ params }: { params: { id: string } }) {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = getSupabaseServerClient();

  const [{ data: site }, { data: connections }, { data: todayItems }, { data: latestPlan }, { data: contentItems }, { count: conversionCount }] = await Promise.all([
    supabase
      .from("sites")
      .select("id, name, url, status, brief_json, brief_confirmed, public_tracking_key")
      .eq("id", params.id)
      .single(),
    supabase
      .from("platform_connections")
      .select("platform, account_name, account_id, connected_at")
      .eq("site_id", params.id),
    supabase
      .from("content_items")
      .select("id, channel, title, body, status, scheduled_date, metadata_json")
      .eq("site_id", params.id)
      .eq("scheduled_date", new Date().toISOString().split("T")[0])
      .not("status", "in", '("published","rejected")')
      .neq("channel", "blog")
      .order("scheduled_date", { ascending: true }),
    supabase
      .from("marketing_plans")
      .select("id, strategy_json, created_at")
      .eq("site_id", params.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("content_items")
      .select("status, body")
      .eq("site_id", params.id),
    supabase
      .from("conversions")
      .select("id", { count: "exact", head: true })
      .eq("site_id", params.id),
  ]);

  if (!site) notFound();

  const planReady = Boolean(latestPlan?.strategy_json);
  const generatedCount = (contentItems || []).filter((item) => Boolean(item.body)).length;
  const approvedCount = (contentItems || []).filter((item) => item.status === "approved" || item.status === "published").length;
  const trackingReady = Boolean((site as Site).public_tracking_key);
  const trackingActive = (conversionCount || 0) > 0;
  const connectedPlatforms = new Set(((connections || []) as PlatformConnection[]).map((connection) => connection.platform));
  const nextAction = !(site as Site).brief_confirmed && (site as Site).brief_json
    ? { label: "Confirm your brief", href: `/sites/${params.id}/brief` }
    : !planReady
    ? { label: "Generate or review your plan", href: `/sites/${params.id}/plan` }
    : generatedCount === 0
    ? { label: "Generate your starter drafts", href: `/sites/${params.id}/plan` }
    : approvedCount === 0
    ? { label: "Review drafts in Queue", href: `/sites/${params.id}/queue` }
    : !trackingReady
    ? { label: "Install tracking", href: `/sites/${params.id}/settings` }
    : { label: "Review performance", href: `/sites/${params.id}/performance` };

  return (
    <div className="max-w-2xl space-y-10">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-gray-400">
          <span>{(site as Site).status || "draft"}</span>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">{(site as Site).name}</h1>
            {(site as Site).url && (
              <a href={(site as Site).url} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-sm text-brand-600 hover:underline">
                {(site as Site).url}
              </a>
            )}
          </div>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Plan", value: planReady ? "Ready" : "Missing", tone: planReady ? "text-emerald-700" : "text-amber-700" },
          { label: "Generated", value: String(generatedCount), tone: "text-gray-900" },
          { label: "Approved", value: String(approvedCount), tone: approvedCount > 0 ? "text-emerald-700" : "text-gray-900" },
          { label: "Tracking", value: trackingActive ? "Live" : trackingReady ? "Ready" : "Missing", tone: trackingActive ? "text-emerald-700" : trackingReady ? "text-brand-700" : "text-amber-700" },
        ].map((item) => (
          <Card key={item.label} padding="md">
            <p className="text-xs uppercase tracking-wide text-gray-400">{item.label}</p>
            <p className={`mt-2 text-xl font-bold ${item.tone}`}>{item.value}</p>
          </Card>
        ))}
      </section>

      <section className="rounded-2xl border border-brand-100 bg-brand-50/50 p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-600">Recommended next move</p>
            <h2 className="mt-2 text-lg font-bold text-gray-900">{nextAction.label}</h2>
            <p className="mt-2 text-sm text-gray-600">
              The product loop is simple: confirm the brief, generate the plan, generate drafts, ship from the queue, then track what actually works.
            </p>
          </div>
          <Link href={nextAction.href} className="inline-flex items-center rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors">
            Open →
          </Link>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant={connectedPlatforms.has("twitter") ? "success" : "warning"}>{connectedPlatforms.has("twitter") ? "X connected" : "X not connected"}</Badge>
          <Badge variant={connectedPlatforms.has("linkedin") ? "success" : "default"}>{connectedPlatforms.has("linkedin") ? "LinkedIn connected" : "LinkedIn optional"}</Badge>
          <Badge variant={trackingReady ? "info" : "warning"}>{trackingReady ? "Tracking key ready" : "Tracking not set up"}</Badge>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Today’s queue</h2>
          <Link href={`/sites/${params.id}/queue`} className="text-xs font-semibold text-brand-600 hover:underline">
            Open Queue →
          </Link>
        </div>
        <TodayPosts
          items={(todayItems ?? []) as { id: string; channel: string; title: string | null; body: string | null; status: string; scheduled_date: string | null; metadata_json?: Record<string, unknown> | null }[]}
          siteId={params.id}
        />
      </section>

      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Your presence</h2>
        <PresencePanel
          siteId={params.id}
          siteUrl={(site as Site).url}
          connections={(connections ?? []) as { platform: string; account_name: string | null; account_id: string | null; connected_at: string | null }[]}
        />
      </section>
    </div>
  );
}

function TodayPosts({
  items,
  siteId,
}: {
  items: { id: string; channel: string; title: string | null; body: string | null; status: string; scheduled_date: string | null; metadata_json?: Record<string, unknown> | null }[];
  siteId: string;
}) {
  if (items.length === 0) {
    return (
      <Link
        href={`/sites/${siteId}/queue`}
        className="flex items-center justify-between rounded-xl border border-dashed border-gray-200 dark:border-gray-700 px-4 py-4 text-gray-400 hover:border-brand-300 hover:text-brand-600 transition-colors group"
      >
        <span className="text-sm font-medium">Nothing in Queue today</span>
        <span className="text-xs group-hover:translate-x-0.5 transition-transform">→</span>
      </Link>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const url = item.body ? getChannelIntentUrl(item.channel, item.body, (item.metadata_json || {}) as never) : null;
        const label = getPublishActionLabel(item.channel);
        const badge = getChannelLabel(item.channel);

        return (
          <div key={item.id} className="flex items-start gap-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">{badge}</p>
              {item.title && <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{item.title}</p>}
              {item.body ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">{item.body}</p>
              ) : (
                <p className="text-xs text-amber-500 mt-0.5">Draft not generated yet</p>
              )}
            </div>
            <div className="flex-shrink-0 pt-0.5 flex flex-col items-end gap-2">
              <Link href={`/sites/${siteId}/queue`} className="text-xs font-semibold bg-brand-500 text-white px-3 py-1.5 rounded-lg hover:bg-brand-600 transition-colors whitespace-nowrap">
                Open Queue
              </Link>
              {url && isManualPostingChannel(item.channel) && (
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-gray-500 hover:text-brand-600 whitespace-nowrap">
                  {label}
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
