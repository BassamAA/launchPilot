import { NextRequest, NextResponse } from "next/server";
import { buildBusinessProfileSummary } from "@/lib/business-profile";
import { buildContentPatternSummary, getLatestPatternSnapshot } from "@/lib/content-patterns";
import { getFunnelIntelligence } from "@/lib/funnel";
import { logRouteError } from "@/lib/observability";
import { sendPlanReadyEmail } from "@/lib/notifications";
import { getPartnerIntelligence } from "@/lib/partners";
import { buildPlanPerformanceSummary } from "@/lib/performance";
import { buildSurfaceSummary, getActiveSurfaceChannels } from "@/lib/surfaces";
import { getAuthorizedSite, getUser, getSupabaseAdminClient } from "@/lib/supabase";
import { seedGrowthExperimentsFromStrategy } from "@/lib/growth";
import { generateMarketingPlan } from "@/lib/generators/plan";
import { GeneratePlanRequest, GrowthSurface } from "@/types";
import { generateAndSaveContentItem } from "@/lib/generators/content";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { site_id, starter_content_count }: GeneratePlanRequest & { starter_content_count?: number } = await req.json();
    if (!site_id) return NextResponse.json({ error: "site_id required" }, { status: 400 });

    const authorizedSite = await getAuthorizedSite(site_id);
    if (!authorizedSite) return NextResponse.json({ error: "Site not found" }, { status: 404 });

    const supabase = getSupabaseAdminClient();

    // Fetch the site with brief
    const { data: site } = await supabase
      .from("sites")
      .select("*")
      .eq("id", site_id)
      .single();

    if (!site || !site.brief_json) {
      return NextResponse.json({ error: "Site not found or brief not confirmed" }, { status: 404 });
    }

    if (!site.brief_confirmed) {
      return NextResponse.json({ error: "Confirm your marketing brief before generating a plan" }, { status: 422 });
    }

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // Check if plan already exists
    const { data: existingPlan } = await supabase
      .from("marketing_plans")
      .select("id, status, strategy_json")
      .eq("site_id", site_id)
      .eq("month", month)
      .eq("year", year)
      .maybeSingle();

    if (existingPlan?.strategy_json) {
      return NextResponse.json(
        { error: "A plan already exists for this month", plan_id: existingPlan.id },
        { status: 409 }
      );
    }

    // Generate the plan
    const [performanceContext, patternSnapshot, surfacesData, partnerIntel, funnelIntel] = await Promise.all([
      buildPlanPerformanceSummary(site_id, supabase),
      getLatestPatternSnapshot(site_id, supabase),
      supabase
        .from("growth_surfaces")
        .select("*")
        .eq("site_id", site_id)
        .in("status", ["active", "recommended"])
        .order("priority", { ascending: true }),
      getPartnerIntelligence(site_id, supabase),
      getFunnelIntelligence(site_id, supabase),
    ]);
    const surfaces = (surfacesData.data || []) as GrowthSurface[];
    const businessProfileSummary = buildBusinessProfileSummary(site.business_profile_json || null);
    const partnerSummary = partnerIntel.targets.length
      ? `Partner intelligence:\n${partnerIntel.targets
          .slice(0, 3)
          .map((target) => `- ${target.platform}: ${target.audience_fit || target.rationale || "High-fit partner target"}`)
          .join("\n")}`
      : "";
    const funnelSummary = funnelIntel.recommendations.length
      ? `Funnel intelligence:\n${funnelIntel.recommendations
          .slice(0, 3)
          .map((row) => `- ${row.category}: ${row.recommendation}`)
          .join("\n")}`
      : "";
    const { strategy, items } = await generateMarketingPlan(site.brief_json, now, {
      performanceSummary: `${businessProfileSummary}\n\n${performanceContext.summary}\n\n${funnelSummary}\n\n${partnerSummary}\n\n${buildContentPatternSummary(patternSnapshot)}`.trim(),
      preferredChannels: getActiveSurfaceChannels(surfaces),
      surfaceSummary: buildSurfaceSummary(surfaces),
    });

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Plan generation returned no action items" }, { status: 500 });
    }

    let planId = existingPlan?.id as string | undefined;

    if (!planId) {
      const { data: plan, error: planError } = await supabase
        .from("marketing_plans")
        .insert({
          site_id,
          month,
          year,
          status: "generating",
        })
        .select()
        .single();

      if (planError || !plan) throw planError || new Error("Failed to create marketing plan");
      planId = plan.id;
    } else {
      await supabase
        .from("content_items")
        .delete()
        .eq("plan_id", planId);
    }

    // Save strategy
    const { error: strategyError } = await supabase
      .from("marketing_plans")
      .update({ strategy_json: strategy, status: "active" })
      .eq("id", planId);

    if (strategyError) throw strategyError;

    // Save all action items as content_items (draft status)
    const contentItems = items.map((item) => ({
      site_id,
      plan_id: planId,
      channel: item.channel,
      content_type: item.action_type,
      title: item.title,
      body: "", // Will be generated by bulk-generate
      metadata_json: { week: item.week, day: item.day, description: item.description },
      status: "draft",
      scheduled_date: item.scheduled_date,
      auto_executable: item.auto_executable,
    }));

    const { error: itemsError } = await supabase
      .from("content_items")
      .insert(contentItems);

    if (itemsError) throw itemsError;

    await seedGrowthExperimentsFromStrategy(site_id, site.brief_json, strategy, supabase);

    const requestedStarterCount = Number.isFinite(starter_content_count)
      ? Math.max(0, Math.min(Number(starter_content_count), 5))
      : 0;

    let starterGenerated = 0;
    let starterFailed = 0;

    if (requestedStarterCount > 0) {
      const starterCandidates = contentItems
        .filter((item) => ["blog", "twitter", "linkedin", "email", "reddit", "directory"].includes(item.channel))
        .slice(0, requestedStarterCount);

      const { data: starterRows } = await supabase
        .from("content_items")
        .select("id")
        .eq("plan_id", planId)
        .in(
          "title",
          starterCandidates.map((item) => item.title)
        )
        .order("scheduled_date", { ascending: true });

      for (const row of starterRows || []) {
        const result = await generateAndSaveContentItem(row.id, supabase);
        if (result.success) starterGenerated += 1;
        else starterFailed += 1;
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }

    // Log activity
    await supabase.from("activity_log").insert({
      site_id,
      action: "plan_generated",
      description: `Growth strategy and 30-day execution plan generated with ${items.length} action items${starterGenerated > 0 ? ` and ${starterGenerated} starter content pieces` : ""}`,
      metadata_json: { plan_id: planId, item_count: items.length, starter_generated: starterGenerated, starter_failed: starterFailed },
    });

    // Fire-and-forget plan-ready notification
    if (user.email) {
      sendPlanReadyEmail({
        to: user.email,
        siteName: site.name || site.url,
        siteId: site_id,
        itemCount: items.length,
      }).catch(() => {
        // Non-critical — log but don't fail the request
      });
    }

    return NextResponse.json({
      plan_id: planId,
      item_count: items.length,
      starter_generated: starterGenerated,
      starter_failed: starterFailed,
    });
  } catch (error) {
    logRouteError("api_generate_plan_failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate plan" },
      { status: 500 }
    );
  }
}
