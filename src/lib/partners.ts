import { buildBusinessProfileSummary } from "@/lib/business-profile";
import { buildMarketingSystemPrompt, callClaude } from "@/lib/claude";
import { getSitePerformanceData } from "@/lib/performance";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { BusinessProfile, GrowthSurface, MarketingBrief, PartnerTarget } from "@/types";

type SupabaseAdmin = ReturnType<typeof getSupabaseAdminClient>;

interface PartnerIntelligenceResult {
  targets: PartnerTarget[];
  generated: boolean;
}

function fallbackPartnerTargets(
  siteId: string,
  businessProfile: BusinessProfile | null,
  influencerSurfaceId: string | null
) {
  const channels = businessProfile?.existing_channels || [];
  const businessType = businessProfile?.business_type || "other";
  const audience = businessProfile?.target_audience || "this audience";
  const offer = businessProfile?.offerings?.[0] || businessProfile?.description || "the offer";

  const archetypes = [
    {
      platform: channels.includes("instagram") ? "instagram" : "twitter",
      audience_fit: `Niche creators who already speak to ${audience}.`,
      content_fit: `Educational or proof-driven posts that show ${offer} in context.`,
      estimated_reach_band: businessType === "creator" ? "10k-50k" : "5k-25k",
      fit_score: 78,
      rationale: `Creators with trusted audiences in this niche are likely to convert better than broad awareness campaigns.`,
      recommended_compensation: "Flat fee + performance bonus",
    },
    {
      platform: "linkedin",
      audience_fit: `Operators and specialists close to the buying decision.`,
      content_fit: `Founder POV, teardown, or workflow-before/after content tied to ${offer}.`,
      estimated_reach_band: "2k-20k",
      fit_score: 71,
      rationale: `Smaller but high-trust B2B creators can drive higher-quality activation than broad consumer reach.`,
      recommended_compensation: "Sponsored post or affiliate split",
    },
    {
      platform: "newsletter",
      audience_fit: `Curated niche audiences already searching for recommendations.`,
      content_fit: `Tool roundups, use-case breakdowns, and founder recommendations.`,
      estimated_reach_band: "1k-15k",
      fit_score: 68,
      rationale: `Newsletter sponsorships are lightweight to test and often outperform cold creator outreach for focused offers.`,
      recommended_compensation: "Flat sponsorship fee",
    },
  ];

  return archetypes.map((target) => ({
    site_id: siteId,
    surface_id: influencerSurfaceId,
    handle: null,
    profile_url: null,
    outreach_status: "suggested",
    metadata_json: {
      target_kind: "archetype",
      search_hint: `${target.platform} creators for ${audience}`,
    },
    ...target,
  }));
}

export async function getPartnerIntelligence(
  siteId: string,
  supabase = getSupabaseAdminClient()
): Promise<PartnerIntelligenceResult> {
  const [{ data: existingTargets }, { data: site }, { data: surfaces }] = await Promise.all([
    supabase
      .from("partner_targets")
      .select("*")
      .eq("site_id", siteId)
      .order("fit_score", { ascending: false })
      .limit(6),
    supabase
      .from("sites")
      .select("brief_json, business_profile_json")
      .eq("id", siteId)
      .single(),
    supabase
      .from("growth_surfaces")
      .select("*")
      .eq("site_id", siteId)
      .eq("surface_type", "influencer_partnership")
      .limit(1),
  ]);

  if ((existingTargets || []).length > 0) {
    return { targets: (existingTargets || []) as PartnerTarget[], generated: false };
  }

  const brief = (site?.brief_json || null) as MarketingBrief | null;
  const businessProfile = (site?.business_profile_json || null) as BusinessProfile | null;
  const influencerSurface = ((surfaces || []) as GrowthSurface[])[0] || null;

  const fallback = fallbackPartnerTargets(siteId, businessProfile, influencerSurface?.id || null);

  if (!brief || !businessProfile) {
    if (fallback.length > 0) {
      const { data } = await supabase.from("partner_targets").insert(fallback).select("*");
      return { targets: (data || fallback) as PartnerTarget[], generated: true };
    }
    return { targets: [], generated: false };
  }

  const performance = await getSitePerformanceData(siteId, supabase);

  try {
    const result = await callClaude<{
      targets: Array<{
        platform: string;
        handle?: string | null;
        profile_url?: string | null;
        audience_fit: string;
        content_fit: string;
        estimated_reach_band: string;
        fit_score: number;
        rationale: string;
        recommended_compensation: string;
        campaign_angle: string;
        content_concept: string;
        cta: string;
        landing_page_recommendation: string;
        outreach_message: string;
        creator_brief: string;
      }>;
    }>({
      model: "sonnet",
      systemPrompt: buildMarketingSystemPrompt(brief),
      userPrompt: `Generate 3-5 influencer / partner target recommendations for this business.

${buildBusinessProfileSummary(businessProfile)}

Active growth surfaces:
${((surfaces || []) as GrowthSurface[]).map((surface) => `- ${surface.display_name}: ${surface.rationale || ""}`).join("\n") || "- None"}

Current funnel:
- Clicks: ${performance.attribution.totalClicks}
- Signups: ${performance.attribution.totalConversions}
- Activated: ${performance.funnel.totalActivated}
- Revenue events: ${performance.funnel.totalRevenueEvents}

Return valid JSON only:
{
  "targets": [
    {
      "platform": "instagram|twitter|linkedin|newsletter|podcast|youtube",
      "handle": "@name or null",
      "profile_url": "https://... or null",
      "audience_fit": "Why their audience fits",
      "content_fit": "What they should post",
      "estimated_reach_band": "5k-25k",
      "fit_score": 82,
      "rationale": "Why they fit now",
      "recommended_compensation": "How to structure the deal",
      "campaign_angle": "The campaign angle",
      "content_concept": "The exact post or content concept",
      "cta": "The CTA they should push",
      "landing_page_recommendation": "The landing page or hook",
      "outreach_message": "A short outreach message",
      "creator_brief": "A lightweight partner brief"
    }
  ]
}`,
      maxTokens: 2200,
      retries: 0,
    });

    const rows = (result.data.targets || []).slice(0, 5);
    if (rows.length === 0) {
      const { data } = await supabase.from("partner_targets").insert(fallback).select("*");
      return { targets: (data || fallback) as PartnerTarget[], generated: true };
    }

    const targetRows = rows.map((row) => ({
      site_id: siteId,
      surface_id: influencerSurface?.id || null,
      platform: row.platform,
      handle: row.handle || null,
      profile_url: row.profile_url || null,
      audience_fit: row.audience_fit,
      content_fit: row.content_fit,
      estimated_reach_band: row.estimated_reach_band,
      fit_score: Math.max(0, Math.min(100, Math.round(row.fit_score || 50))),
      rationale: row.rationale,
      recommended_compensation: row.recommended_compensation,
      metadata_json: {},
    }));

    const { data: insertedTargets } = await supabase.from("partner_targets").insert(targetRows).select("*");
    const inserted = (insertedTargets || []) as PartnerTarget[];

    for (let index = 0; index < inserted.length; index += 1) {
      const target = inserted[index];
      const row = rows[index];
      const { data: campaign } = await supabase
        .from("partner_campaigns")
        .insert({
          site_id: siteId,
          partner_target_id: target.id,
          campaign_angle: row.campaign_angle,
          content_concept: row.content_concept,
          cta: row.cta,
          landing_page_recommendation: row.landing_page_recommendation,
          status: "ready",
          metadata_json: {},
        })
        .select("*")
        .single();

      if (campaign) {
        await supabase.from("partner_briefs").insert({
          site_id: siteId,
          partner_target_id: target.id,
          partner_campaign_id: campaign.id,
          outreach_message: row.outreach_message,
          creator_brief: row.creator_brief,
          copy_export: `${row.outreach_message}\n\n---\n\n${row.creator_brief}`,
          metadata_json: {},
        });
      }
    }

    return { targets: inserted, generated: true };
  } catch {
    const { data } = await supabase.from("partner_targets").insert(fallback).select("*");
    return { targets: (data || fallback) as PartnerTarget[], generated: true };
  }
}
