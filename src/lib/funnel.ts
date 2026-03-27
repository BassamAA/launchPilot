import { buildBusinessProfileSummary } from "@/lib/business-profile";
import { buildMarketingSystemPrompt, callClaude } from "@/lib/claude";
import { getSitePerformanceData } from "@/lib/performance";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { BusinessProfile, FunnelRecommendation, MarketingBrief, OfferTest } from "@/types";
import { BRAND_NAME } from "@/lib/brand";

type SupabaseAdmin = ReturnType<typeof getSupabaseAdminClient>;

interface FunnelIntelligenceResult {
  recommendations: FunnelRecommendation[];
  offerTests: OfferTest[];
  generated: boolean;
}

function buildFallbackFunnelRecommendations(siteId: string, performance: Awaited<ReturnType<typeof getSitePerformanceData>>) {
  const recommendations = [];

  if (performance.attribution.totalClicks > 0 && performance.attribution.totalConversions === 0) {
    recommendations.push({
      site_id: siteId,
      category: "landing_page",
      title: "Tighten the landing-page promise",
      recommendation:
        `Traffic is arriving but not converting. Make the first screen mirror the promise used in ${BRAND_NAME} content and shorten the path to the primary CTA.`,
      priority: 1,
      rationale: "Clicks are present without downstream conversion proof.",
      status: "open",
      metadata_json: {},
    });
  }

  if (performance.funnel.totalSignups > 0 && performance.funnel.totalActivated === 0) {
    recommendations.push({
      site_id: siteId,
      category: "activation",
      title: "Reduce post-signup friction",
      recommendation:
        "Users are signing up but not activating. Add a shorter onboarding path, faster time-to-value, and one explicit next action after signup.",
      priority: 1,
      rationale: "Signups are not turning into activated users.",
      status: "open",
      metadata_json: {},
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      site_id: siteId,
      category: "offer",
      title: "Clarify the offer and CTA",
      recommendation:
        "Keep the landing page focused on one conversion goal, sharpen the benefit-led headline, and make the CTA outcome-specific instead of generic.",
      priority: 2,
      rationale: "Baseline funnel optimization guidance before more traffic is added.",
      status: "open",
      metadata_json: {},
    });
  }

  return recommendations as FunnelRecommendation[];
}

export async function getFunnelIntelligence(
  siteId: string,
  supabase = getSupabaseAdminClient()
): Promise<FunnelIntelligenceResult> {
  const [{ data: site }, { data: existingRecommendations }, { data: existingTests }] = await Promise.all([
    supabase
      .from("sites")
      .select("brief_json, business_profile_json")
      .eq("id", siteId)
      .single(),
    supabase
      .from("funnel_recommendations")
      .select("*")
      .eq("site_id", siteId)
      .order("priority", { ascending: true })
      .limit(6),
    supabase
      .from("offer_tests")
      .select("*")
      .eq("site_id", siteId)
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  if ((existingRecommendations || []).length > 0 || (existingTests || []).length > 0) {
    return {
      recommendations: (existingRecommendations || []) as FunnelRecommendation[],
      offerTests: (existingTests || []) as OfferTest[],
      generated: false,
    };
  }

  const brief = (site?.brief_json || null) as MarketingBrief | null;
  const businessProfile = (site?.business_profile_json || null) as BusinessProfile | null;
  const performance = await getSitePerformanceData(siteId, supabase);
  const fallback = buildFallbackFunnelRecommendations(siteId, performance);

  if (!brief || !businessProfile) {
    const { data } = await supabase.from("funnel_recommendations").insert(fallback).select("*");
    return {
      recommendations: (data || fallback) as FunnelRecommendation[],
      offerTests: [],
      generated: true,
    };
  }

  try {
    const result = await callClaude<{
      recommendations: Array<{
        category: string;
        title: string;
        recommendation: string;
        priority: number;
        rationale: string;
      }>;
      offer_tests: Array<{
        hypothesis: string;
        test_type: string;
        proposed_change: string;
        success_metric: string;
      }>;
    }>({
      model: "sonnet",
      systemPrompt: buildMarketingSystemPrompt(brief),
      userPrompt: `Generate funnel and offer intelligence for this business.

${buildBusinessProfileSummary(businessProfile)}

Outcome funnel:
- Clicks: ${performance.funnel.totalClicks}
- Signups: ${performance.funnel.totalSignups}
- Onboarding complete: ${performance.funnel.totalOnboardingComplete}
- Activated: ${performance.funnel.totalActivated}
- Revenue events: ${performance.funnel.totalRevenueEvents}
- Revenue value: ${performance.funnel.totalRevenueValue}

Top converting content:
${performance.attribution.topConvertingContent
  .slice(0, 5)
  .map((item) => `- ${item.channel}: ${item.title} (${item.conversions || 0} conversions from ${item.clicks || 0} clicks)`)
  .join("\n") || "- None"}

Return valid JSON only:
{
  "recommendations": [
    {
      "category": "landing_page|offer|activation|pricing|onboarding",
      "title": "Short recommendation title",
      "recommendation": "What should change",
      "priority": 1,
      "rationale": "Why this matters now"
    }
  ],
  "offer_tests": [
    {
      "hypothesis": "What we believe",
      "test_type": "headline|cta|pricing|onboarding|landing_page",
      "proposed_change": "The exact change to test",
      "success_metric": "What proves the test worked"
    }
  ]
}`,
      maxTokens: 2200,
      retries: 0,
    });

    const recommendationRows = (result.data.recommendations || []).slice(0, 5).map((row) => ({
      site_id: siteId,
      category: row.category,
      title: row.title,
      recommendation: row.recommendation,
      priority: row.priority || 1,
      rationale: row.rationale,
      status: "open",
      metadata_json: {},
    }));
    const testRows = (result.data.offer_tests || []).slice(0, 4).map((row) => ({
      site_id: siteId,
      hypothesis: row.hypothesis,
      test_type: row.test_type,
      proposed_change: row.proposed_change,
      success_metric: row.success_metric,
      status: "proposed",
      metadata_json: {},
    }));

    const insertedRecommendations =
      recommendationRows.length > 0
        ? await supabase.from("funnel_recommendations").insert(recommendationRows).select("*")
        : await supabase.from("funnel_recommendations").insert(fallback).select("*");
    const insertedTests =
      testRows.length > 0
        ? await supabase.from("offer_tests").insert(testRows).select("*")
        : { data: [] };

    return {
      recommendations: ((insertedRecommendations.data || fallback) as FunnelRecommendation[]).slice(0, 5),
      offerTests: (insertedTests.data || []) as OfferTest[],
      generated: true,
    };
  } catch {
    const { data } = await supabase.from("funnel_recommendations").insert(fallback).select("*");
    return {
      recommendations: (data || fallback) as FunnelRecommendation[],
      offerTests: [],
      generated: true,
    };
  }
}
