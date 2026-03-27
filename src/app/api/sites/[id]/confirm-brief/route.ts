import { NextRequest, NextResponse } from "next/server";
import { mergeAnalyzedSources } from "@/lib/analyzers/orchestrator";
import { buildBusinessProfile } from "@/lib/business-profile";
import { getFunnelIntelligence } from "@/lib/funnel";
import { logRouteError } from "@/lib/observability";
import { buildInitialOnboardingState, getOnboardingConfig } from "@/lib/onboarding";
import { getPartnerIntelligence } from "@/lib/partners";
import { recommendGrowthSurfaces, replaceGrowthSurfaces } from "@/lib/surfaces";
import { getAuthorizedSite, getUser, getSupabaseAdminClient } from "@/lib/supabase";
import { GrowthSurface, MarketingBrief } from "@/types";
import {
  WebsiteAnalysis,
  TwitterAnalysis,
  InstagramAnalysis,
  LinkedInAnalysis,
} from "@/lib/analyzers/types";

type StoredSourceEntry<T = Record<string, unknown>> = {
  url?: string;
  handle?: string;
  raw_data?: T;
};

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { brief }: { brief: MarketingBrief } = await req.json();
    const site = await getAuthorizedSite(params.id);
    if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

    const supabase = getSupabaseAdminClient();

    const { data: currentSite } = await supabase
      .from("sites")
      .select("sources_json, onboarding_json")
      .eq("id", params.id)
      .maybeSingle();

    const sourceJson = (currentSite?.sources_json || {}) as {
      website?: StoredSourceEntry<WebsiteAnalysis>;
      twitter?: StoredSourceEntry<TwitterAnalysis>;
      instagram?: StoredSourceEntry<InstagramAnalysis>;
      linkedin?: StoredSourceEntry<LinkedInAnalysis>;
    };
    const merged = mergeAnalyzedSources({
      website: sourceJson.website?.raw_data,
      twitter: sourceJson.twitter?.raw_data,
      instagram: sourceJson.instagram?.raw_data,
      linkedin: sourceJson.linkedin?.raw_data,
    });
    const businessProfile = buildBusinessProfile(merged, brief);
    const onboardingState = buildInitialOnboardingState({
      brief,
      businessProfile,
      sourcesJson: sourceJson as Record<string, unknown>,
      existing: (currentSite?.onboarding_json || null) as Record<string, unknown> | null,
    });
    const onboardingConfig = getOnboardingConfig(onboardingState.persona || "generic");

    await supabase
      .from("sites")
      .update({
        brief_json: brief,
        business_profile_json: businessProfile,
        onboarding_json: onboardingState,
        brief_confirmed: true,
        status: "active",
      })
      .eq("id", params.id);

    const surfaces: Array<Omit<GrowthSurface, "id" | "site_id" | "created_at" | "updated_at">> =
      (await recommendGrowthSurfaces(brief, merged)).map((surface) => {
        if (!onboardingConfig.suggestedSurfaces.includes(surface.surface_type)) {
          return surface;
        }
        return {
          ...surface,
          status: surface.status === "not_applicable" ? "not_applicable" : "active",
        };
      });
    await replaceGrowthSurfaces(params.id, surfaces, supabase);
    await getFunnelIntelligence(params.id, supabase);
    if (surfaces.some((surface) => surface.surface_type === "influencer_partnership")) {
      await getPartnerIntelligence(params.id, supabase);
    }

    await supabase.from("activity_log").insert({
      site_id: site.id,
      action: "brief_confirmed",
      description: "Marketing brief confirmed by user",
      metadata_json: {
        growth_surface_count: surfaces.length,
        onboarding_persona: onboardingState.persona || "generic",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logRouteError("api_confirm_brief_failed", error, { site_id: params.id });
    return NextResponse.json({ error: "Failed to confirm brief" }, { status: 500 });
  }
}
