import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser, getSupabaseServerClient } from "@/lib/supabase";
import { Badge } from "@/components/ui";
import { PlusIcon, GlobeAltIcon, RocketLaunchIcon } from "@heroicons/react/24/outline";
import { SparklesIcon } from "@heroicons/react/24/solid";
import { GettingStartedChecklist } from "@/components/onboarding/GettingStartedChecklist";
import { buildPersonaSummary, getOnboardingConfig } from "@/lib/onboarding";
import { PlatformConnection, Site, SiteOnboardingState } from "@/types";
import { BRAND_NAME } from "@/lib/brand";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = getSupabaseServerClient();

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("company_id, name, subscription_tier")
    .eq("id", user.id)
    .single();

  if (!profile?.company_id) redirect("/onboarding");

  const { data: sites } = await supabase
    .from("sites")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false });

  const allSites: Site[] = (sites as Site[]) || [];
  const primarySite = allSites[0] || null;

  let dashboardChecklist: {
    siteId: string;
    persona: ReturnType<typeof buildPersonaSummary>["persona"];
    onboarding: SiteOnboardingState | null | undefined;
    briefConfirmed: boolean;
    activeSurfaceCount: number;
    twitterConnected: boolean;
    approvedCount: number;
    hasTrackingActivity: boolean;
    canReviewPerformance: boolean;
    quickWins: string[];
  } | null = null;

  if (primarySite) {
    const [{ count: activeSurfaceCount }, { count: approvedCount }, { count: trackingCount }, { data: connections }] = await Promise.all([
      supabase
        .from("growth_surfaces")
        .select("id", { count: "exact", head: true })
        .eq("site_id", primarySite.id)
        .in("status", ["active", "recommended"]),
      supabase
        .from("content_items")
        .select("id", { count: "exact", head: true })
        .eq("site_id", primarySite.id)
        .in("status", ["approved", "published"]),
      supabase
        .from("conversions")
        .select("id", { count: "exact", head: true })
        .eq("site_id", primarySite.id),
      supabase
        .from("platform_connections")
        .select("platform")
        .eq("site_id", primarySite.id),
    ]);

    const personaSummary = buildPersonaSummary(primarySite as Site);
    const config = getOnboardingConfig(personaSummary.persona);
    const connectedPlatforms = new Set((connections as Pick<PlatformConnection, "platform">[] | null | undefined)?.map((connection) => connection.platform) || []);

    dashboardChecklist = {
      siteId: primarySite.id,
      persona: personaSummary.persona,
      onboarding: (primarySite.onboarding_json as SiteOnboardingState | null | undefined) ?? null,
      briefConfirmed: Boolean(primarySite.brief_confirmed),
      activeSurfaceCount: activeSurfaceCount || 0,
      twitterConnected: connectedPlatforms.has("twitter"),
      approvedCount: approvedCount || 0,
      hasTrackingActivity: (trackingCount || 0) > 0,
      canReviewPerformance: (trackingCount || 0) > 0,
      quickWins: config.quickWins,
    };
  }

  // Aggregate content stats across all sites
  let stats = { generated: 0, approved: 0, published: 0 };
  if (allSites.length > 0) {
    const siteIds = allSites.map((s) => s.id);
    const { data: counts } = await supabase
      .from("content_items")
      .select("status")
      .in("site_id", siteIds);

    if (counts) {
      stats.generated = counts.length;
      stats.approved = counts.filter((c) => c.status === "approved").length;
      stats.published = counts.filter((c) => c.status === "published").length;
    }
  }

  const firstName = profile.name?.split(" ")[0] || user.email?.split("@")[0] || "there";

  // Empty state
  if (allSites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 rounded-2xl bg-brand-50 flex items-center justify-center mb-6">
          <RocketLaunchIcon className="w-10 h-10 text-brand-500" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Hey {firstName}, let's get your first customers.
        </h1>
        <p className="text-gray-500 text-lg max-w-md mb-10 leading-relaxed">
          Paste your site URL and {BRAND_NAME} will analyze it, identify your ideal customer,
          and generate a complete 30-day marketing plan.
        </p>
        <Link
          href="/sites/new"
          className="inline-flex items-center gap-2 px-8 py-4 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-600 transition-colors text-base shadow-sm"
        >
          <SparklesIcon className="w-5 h-5" />
          Analyze my first site
        </Link>
        <p className="mt-4 text-sm text-gray-400">Takes about 30 seconds · No technical setup</p>
      </div>
    );
  }

  function getSiteHostname(site: Site) {
    try {
      const url = site.url.startsWith("http") ? site.url : `https://${site.url}`;
      return new URL(url).hostname;
    } catch {
      return site.url;
    }
  }

  return (
    <div className="space-y-8">
      {/* Heading */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome back, {firstName}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Here's your marketing operation overview.
        </p>
      </div>

      {dashboardChecklist && (
        <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <GettingStartedChecklist
            siteId={dashboardChecklist.siteId}
            persona={dashboardChecklist.persona}
            onboarding={dashboardChecklist.onboarding}
            briefConfirmed={dashboardChecklist.briefConfirmed}
            activeSurfaceCount={dashboardChecklist.activeSurfaceCount}
            twitterConnected={dashboardChecklist.twitterConnected}
            approvedCount={dashboardChecklist.approvedCount}
            hasTrackingActivity={dashboardChecklist.hasTrackingActivity}
            canReviewPerformance={dashboardChecklist.canReviewPerformance}
          />

          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-600">Quick wins</p>
            <h2 className="mt-3 text-lg font-bold text-gray-900">What to do next</h2>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              The app already has enough context to suggest the highest-leverage next moves for your primary site.
            </p>
            <div className="mt-5 space-y-3">
              {dashboardChecklist.quickWins.map((win) => (
                <div key={win} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                  {win}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Sites", value: allSites.length, color: "text-brand-600" },
          { label: "Content Generated", value: stats.generated, color: "text-gray-900" },
          { label: "Approved", value: stats.approved, color: "text-emerald-600" },
          { label: "Published", value: stats.published, color: "text-sky-600" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{stat.label}</p>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Sites */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Your sites</h2>
          <Link
            href="/sites/new"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            <PlusIcon className="w-4 h-4" />
            Add site
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allSites.map((site) => (
            <Link key={site.id} href={`/sites/${site.id}`}>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer h-full">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center">
                    <GlobeAltIcon className="w-5 h-5 text-brand-600" />
                  </div>
                  <Badge
                    variant={
                      site.status === "active" ? "success" :
                      site.status === "analyzing" ? "warning" :
                      site.status === "error" ? "danger" : "default"
                    }
                  >
                    {site.status}
                  </Badge>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white truncate mb-1">
                  {site.name || getSiteHostname(site)}
                </h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{site.url}</p>
                {!site.brief_confirmed && site.brief_json && (
                  <div className="mt-3 px-3 py-1.5 bg-amber-50 rounded-lg text-xs text-amber-700 font-medium">
                    Action needed: confirm your brief →
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
