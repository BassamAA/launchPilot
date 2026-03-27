import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser, getSupabaseServerClient } from "@/lib/supabase";
import { Button, Card, Badge, EmptyState } from "@/components/ui";
import { PlusIcon, GlobeAltIcon, RocketLaunchIcon } from "@heroicons/react/24/outline";
import { Site } from "@/types";

export default async function SitesPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = getSupabaseServerClient();

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();

  let sites: Site[] = [];
  if (profile?.company_id) {
    const { data } = await supabase
      .from("sites")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false });
    sites = (data as Site[]) || [];
  }

  if (sites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 rounded-2xl bg-brand-50 flex items-center justify-center mb-8">
          <RocketLaunchIcon className="w-10 h-10 text-brand-500" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Paste your first URL and watch the magic happen
        </h1>
        <p className="text-gray-500 text-lg max-w-md mb-10">
          LaunchPilot will analyze your site, identify your customers, and generate a complete marketing plan.
        </p>
        <Link href="/sites/new">
          <Button size="lg" className="px-8">
            <PlusIcon className="w-5 h-5" />
            Add your site
          </Button>
        </Link>
        <p className="mt-6 text-sm text-gray-400">Takes less than 3 minutes to get your first content</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Your Sites</h1>
          <p className="text-gray-500 text-sm mt-1">{sites.length} site{sites.length !== 1 && "s"} in your marketing operation</p>
        </div>
        <Link href="/sites/new">
          <Button>
            <PlusIcon className="w-4 h-4" />
            Add site
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sites.map((site) => (
          <Link key={site.id} href={`/sites/${site.id}`}>
            <Card hover className="h-full">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
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

              <h3 className="font-bold text-gray-900 mb-1 truncate">
                {site.name || new URL(site.url.startsWith("http") ? site.url : `https://${site.url}`).hostname}
              </h3>
              <p className="text-sm text-gray-400 truncate mb-4">{site.url}</p>

              {site.brief_json && (
                <p className="text-sm text-gray-600 line-clamp-2">
                  {site.brief_json.one_liner}
                </p>
              )}

              {!site.brief_confirmed && site.brief_json && (
                <div className="mt-4 px-3 py-2 bg-amber-50 rounded-lg text-xs text-amber-700 font-medium">
                  Review your marketing brief to unlock your 30-day plan →
                </div>
              )}
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
