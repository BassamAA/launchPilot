import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser, getSupabaseServerClient } from "@/lib/supabase";
import { Badge } from "@/components/ui";
import { PlusIcon, GlobeAltIcon, RocketLaunchIcon } from "@heroicons/react/24/outline";
import { SparklesIcon } from "@heroicons/react/24/solid";
import { Site } from "@/types";
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
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {firstName}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Here's your marketing operation overview.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Sites", value: allSites.length, color: "text-brand-600" },
          { label: "Content Generated", value: stats.generated, color: "text-gray-900" },
          { label: "Approved", value: stats.approved, color: "text-emerald-600" },
          { label: "Published", value: stats.published, color: "text-sky-600" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <p className="text-xs text-gray-400 mb-1">{stat.label}</p>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Sites */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Your sites</h2>
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
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer h-full">
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
                <h3 className="font-semibold text-gray-900 truncate mb-1">
                  {site.name || getSiteHostname(site)}
                </h3>
                <p className="text-xs text-gray-400 truncate">{site.url}</p>
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
