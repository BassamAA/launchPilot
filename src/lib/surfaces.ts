import { callClaude } from "@/lib/claude";
import { MergedAnalysis } from "@/lib/analyzers/types";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { ContentChannel, GrowthSurface, GrowthSurfaceType, MarketingBrief } from "@/types";

type SupabaseAdmin = ReturnType<typeof getSupabaseAdminClient>;

const SURFACE_DEFS: Record<
  GrowthSurfaceType,
  {
    displayName: string;
    channels: string[];
    executionReady: boolean;
    objective: string;
    readinessReason: string;
    executionOwner: "launchpilot" | "human" | "hybrid";
  }
> = {
  founder_social: { displayName: "Founder-Led Social", channels: ["twitter", "linkedin"], executionReady: true, objective: "Build trust and repeatable top-of-funnel demand through founder voice.", readinessReason: "LaunchPilot can generate and publish founder-led social content today.", executionOwner: "launchpilot" },
  seo_content: { displayName: "SEO Content", channels: ["blog"], executionReady: true, objective: "Create compounding inbound acquisition through search intent content.", readinessReason: "LaunchPilot can generate and publish hosted blog content today.", executionOwner: "launchpilot" },
  short_form_video: { displayName: "Short-Form Video", channels: ["tiktok", "instagram"], executionReady: false, objective: "Reach new audiences through visual short-form distribution.", readinessReason: "Strategy support exists, but native creative production is not implemented yet.", executionOwner: "human" },
  cold_outbound: { displayName: "Cold Outbound", channels: ["email"], executionReady: true, objective: "Create direct demand from hand-picked prospects.", readinessReason: "LaunchPilot can draft and send email-based outbound sequences.", executionOwner: "launchpilot" },
  community_engagement: { displayName: "Community Engagement", channels: ["reddit"], executionReady: true, objective: "Win trust inside existing communities and turn it into traffic.", readinessReason: "LaunchPilot can generate community content and guide manual distribution.", executionOwner: "hybrid" },
  directory_presence: { displayName: "Directory Presence", channels: ["directory"], executionReady: true, objective: "Capture existing buyer intent on directories and launch surfaces.", readinessReason: "LaunchPilot can generate submission-ready directory content today.", executionOwner: "hybrid" },
  influencer_partnership: { displayName: "Influencer Partnership", channels: [], executionReady: false, objective: "Borrow trusted distribution from creators and niche operators.", readinessReason: "LaunchPilot can plan targets and briefs, but execution remains human-led.", executionOwner: "human" },
  referral_program: { displayName: "Referral Program", channels: [], executionReady: false, objective: "Turn current users and customers into a compounding acquisition loop.", readinessReason: "LaunchPilot can recommend program strategy, but not run referral infrastructure yet.", executionOwner: "human" },
  lifecycle_email: { displayName: "Lifecycle Email", channels: ["email"], executionReady: false, objective: "Improve activation and retention after acquisition.", readinessReason: "LaunchPilot can plan lifecycle strategy, but automated lifecycle orchestration is not fully implemented yet.", executionOwner: "hybrid" },
  paid_acquisition: { displayName: "Paid Acquisition", channels: [], executionReady: false, objective: "Scale validated demand through paid testing.", readinessReason: "LaunchPilot can recommend paid motions, but does not manage ad accounts yet.", executionOwner: "human" },
  landing_page_optimization: { displayName: "Landing Page Optimization", channels: [], executionReady: false, objective: "Improve click-to-signup and signup-to-activation conversion efficiency.", readinessReason: "LaunchPilot can surface funnel recommendations, but not directly edit the site yet.", executionOwner: "hybrid" },
};

const EXECUTABLE_CHANNELS = new Set<ContentChannel>([
  "blog",
  "twitter",
  "reddit",
  "email",
  "tiktok",
  "directory",
]);

function dedupe<T>(items: T[]) {
  return Array.from(new Set(items));
}

function inferBusinessType(brief: MarketingBrief, merged: MergedAnalysis["merged"]) {
  const lower = `${brief.value_proposition} ${brief.positioning} ${merged.description}`.toLowerCase();
  if (/\bsaas\b|\bsoftware\b|\bapi\b|\bplatform\b/.test(lower)) return "saas";
  if (/\bagency\b|\bconsulting\b|\bservice\b|\bfreelance\b/.test(lower)) return "service";
  if (/\becommerce\b|\bshop\b|\bstore\b|\bproduct\b/.test(lower)) return "ecommerce";
  if (/\bcreator\b|\byoutube\b|\bnewsletter\b|\bcommunity\b/.test(lower)) return "creator";
  if (/\blocal\b|\bclinic\b|\bstudio\b|\bsalon\b|\brestaurant\b/.test(lower)) return "local";
  return brief.business_type || "other";
}

function inferMonetizationModel(brief: MarketingBrief, merged: MergedAnalysis["merged"]) {
  const lower = `${brief.value_proposition} ${merged.pricing || ""}`.toLowerCase();
  if (/\bmonthly\b|\bmonth\b|\bsubscription\b/.test(lower)) return "subscription";
  if (/\bone-time\b|\bonce\b|\blifetime\b/.test(lower)) return "one-time";
  if (/\bfree\b|\bfreemium\b/.test(lower)) return "freemium";
  if (/\bservice\b|\bbook\b|\bcall\b/.test(lower)) return "service-fee";
  if (/\bproduct\b|\bshipping\b|\bshop\b/.test(lower)) return "physical-product";
  return brief.monetization_model || "other";
}

function buildFallbackSurfaces(brief: MarketingBrief, merged: MergedAnalysis): Array<Omit<GrowthSurface, "id" | "site_id" | "created_at" | "updated_at">> {
  const businessType = inferBusinessType(brief, merged.merged);
  const surfaces: GrowthSurfaceType[] = ["community_engagement", "directory_presence"];

  if (businessType === "saas" || businessType === "creator") {
    surfaces.push("founder_social", "seo_content", "directory_presence");
  }
  if (merged.sources.twitter && merged.sources.twitter.followerCount > 500) {
    surfaces.unshift("founder_social");
  }
  if (merged.sources.website || merged.merged.websiteUrl) {
    surfaces.push("seo_content");
  }
  if (businessType === "ecommerce") {
    surfaces.push("short_form_video", "lifecycle_email");
  }
  if (businessType === "service" || businessType === "agency") {
    surfaces.push("cold_outbound", "referral_program");
  }

  const ordered = dedupe(surfaces).slice(0, 6);

  return ordered.map((surfaceType, index) => ({
    surface_type: surfaceType,
    display_name: SURFACE_DEFS[surfaceType].displayName,
    status: index < 3 ? "active" : "recommended",
    priority: index + 1,
      rationale: `Recommended based on the ${businessType} business model and current online presence.`,
    execution_ready: SURFACE_DEFS[surfaceType].executionReady,
    channels: SURFACE_DEFS[surfaceType].channels,
    objective: SURFACE_DEFS[surfaceType].objective,
    readiness_reason: SURFACE_DEFS[surfaceType].readinessReason,
    execution_owner: SURFACE_DEFS[surfaceType].executionOwner,
    metadata_json: {},
    last_reviewed_at: new Date().toISOString(),
  }));
}

export async function recommendGrowthSurfaces(
  brief: MarketingBrief,
  merged: MergedAnalysis
): Promise<Array<Omit<GrowthSurface, "id" | "site_id" | "created_at" | "updated_at">>> {
  const fallback = buildFallbackSurfaces(brief, merged);

  try {
    const result = await callClaude<{
      surfaces: Array<{
        surface_type: GrowthSurfaceType;
        rationale: string;
        priority: number;
        status?: "recommended" | "active" | "paused" | "not_applicable";
      }>;
    }>({
      model: "sonnet",
      systemPrompt: "You recommend growth surfaces for a business. Return valid JSON only.",
      userPrompt: `Recommend 4-6 growth surfaces for this business.

Business summary:
${JSON.stringify({
  product_name: brief.product_name,
  one_liner: brief.one_liner,
  target_customer: brief.target_customer,
  value_proposition: brief.value_proposition,
  existing_channels: brief.existing_channels || merged.merged.existingChannels,
  business_type: brief.business_type || inferBusinessType(brief, merged.merged),
  monetization_model: brief.monetization_model || inferMonetizationModel(brief, merged.merged),
  follower_counts: merged.merged.followerCounts,
})}

Allowed surface types:
founder_social, seo_content, short_form_video, cold_outbound, community_engagement, directory_presence, influencer_partnership, referral_program, lifecycle_email, paid_acquisition, landing_page_optimization

Return:
{
  "surfaces": [
    {
      "surface_type": "founder_social",
      "rationale": "Why it fits this business",
      "priority": 1,
      "status": "active|recommended|paused|not_applicable"
    }
  ]
}`,
      maxTokens: 1200,
      retries: 0,
    });

    const rows = (result.data.surfaces || [])
      .filter((surface) => surface?.surface_type && SURFACE_DEFS[surface.surface_type])
      .slice(0, 6)
      .map((surface) => ({
        surface_type: surface.surface_type,
        display_name: SURFACE_DEFS[surface.surface_type].displayName,
        status: surface.status || (surface.priority <= 3 ? "active" : "recommended"),
        priority: surface.priority || 1,
        rationale: surface.rationale,
        execution_ready: SURFACE_DEFS[surface.surface_type].executionReady,
        channels: SURFACE_DEFS[surface.surface_type].channels,
        objective: SURFACE_DEFS[surface.surface_type].objective,
        readiness_reason: SURFACE_DEFS[surface.surface_type].readinessReason,
        execution_owner: SURFACE_DEFS[surface.surface_type].executionOwner,
        metadata_json: {},
        last_reviewed_at: new Date().toISOString(),
      }));

    return rows.length > 0 ? rows : fallback;
  } catch {
    return fallback;
  }
}

export async function replaceGrowthSurfaces(
  siteId: string,
  surfaces: Array<Omit<GrowthSurface, "id" | "site_id" | "created_at" | "updated_at">>,
  supabase: SupabaseAdmin
) {
  await supabase.from("growth_surfaces").delete().eq("site_id", siteId);
  if (surfaces.length === 0) return [];

  const { data } = await supabase
    .from("growth_surfaces")
    .insert(
      surfaces.map((surface) => ({
        site_id: siteId,
        ...surface,
      }))
    )
    .select("*");

  return (data || []) as GrowthSurface[];
}

export function getActiveSurfaceChannels(surfaces: GrowthSurface[]): ContentChannel[] {
  const weighted = surfaces
    .filter((surface) => surface.status === "active")
    .sort((a, b) => a.priority - b.priority)
    .flatMap((surface) => {
      const weight = Math.max(1, 5 - Math.min(surface.priority, 4));
      return Array.from({ length: weight }, () => surface.channels).flat();
    })
    .filter((channel): channel is ContentChannel => EXECUTABLE_CHANNELS.has(channel as ContentChannel));

  return (weighted.length > 0 ? weighted : ["blog", "twitter", "reddit", "email", "directory"]) as ContentChannel[];
}

export function buildSurfaceSummary(surfaces: GrowthSurface[]) {
  if (surfaces.length === 0) return "";
  return `Active growth surfaces:
${surfaces
  .filter((surface) => surface.status === "active")
  .sort((a, b) => a.priority - b.priority)
  .map((surface) => `- ${surface.display_name} (priority ${surface.priority}, owner ${surface.execution_owner || "launchpilot"}) via ${surface.channels.join(", ") || "strategy only"}: ${surface.rationale || "No rationale provided"}${surface.objective ? ` Objective: ${surface.objective}` : ""}`)
  .join("\n")}`;
}
