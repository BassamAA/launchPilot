import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui";
import { BusinessProfilePanel } from "@/components/sites/BusinessProfilePanel";
import { SiteConnectionsPanel } from "@/components/sites/SiteConnectionsPanel";
import { DeleteSiteButton } from "@/components/sites/DeleteSiteButton";
import { AutopilotPanel } from "@/components/sites/AutopilotPanel";
import { getSupabaseServerClient, getUser } from "@/lib/supabase";
import { BusinessProfile, PlatformConnection, Site, SiteOnboardingState } from "@/types";

export default async function SiteSettingsPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { connected?: string; error?: string; twitter_error?: string };
}) {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = getSupabaseServerClient();
  const { data: site } = await supabase
    .from("sites")
    .select("id, name, slug, status, public_tracking_key, autopilot_enabled, business_profile_json, sources_json, onboarding_json")
    .eq("id", params.id)
    .single();

  if (!site) notFound();

  const { data: connections } = await supabase
    .from("platform_connections")
    .select("*")
    .eq("site_id", params.id);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{site.name} Settings</h1>
            <Badge variant="info">Connections</Badge>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Configure Twitter, LinkedIn, hosted blog behavior, and email delivery for this site.
          </p>
        </div>
      </div>

      <SiteConnectionsPanel
        site={site as Pick<Site, "id" | "name" | "slug" | "public_tracking_key">}
        connections={(connections || []) as PlatformConnection[]}
        onboarding={(site.onboarding_json as SiteOnboardingState | null | undefined) ?? null}
        connected={searchParams.connected}
        error={searchParams.error}
        twitterError={searchParams.twitter_error}
        appUrl={process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}
      />

      <AutopilotPanel
        siteId={params.id}
        autopilotEnabled={!!(site as Site & { autopilot_enabled?: boolean }).autopilot_enabled}
        twitterConnected={!!(connections || []).find((c) => (c as PlatformConnection).platform === "twitter")}
        linkedinConnected={!!(connections || []).find((c) => (c as PlatformConnection).platform === "linkedin")}
      />

      <BusinessProfilePanel
        siteId={params.id}
        profile={((site.business_profile_json as BusinessProfile | null | undefined) ?? null)}
        sourcesJson={(site.sources_json || null) as Record<string, unknown> | null}
      />

      {/* Danger zone */}
      <div className="rounded-xl border border-red-100 bg-red-50/40 p-6">
        <h2 className="font-bold text-red-900 mb-1">Danger Zone</h2>
        <p className="text-sm text-red-700 mb-4">
          Permanently delete this site and all associated content, plans, and analytics. This cannot be undone.
        </p>
        <DeleteSiteButton siteId={params.id} siteName={site.name || "this site"} />
      </div>
    </div>
  );
}
