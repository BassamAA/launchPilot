import { NextRequest, NextResponse } from "next/server";
import { getAuthorizedPlan, getUser, getSupabaseAdminClient } from "@/lib/supabase";
import { generateAndSaveContentItem } from "@/lib/generators/content";
import { publishContentItem } from "@/lib/publishing";
import { logRouteError } from "@/lib/observability";
import { BulkGenerateRequest, ContentChannel, SiteOnboardingState } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { plan_id }: BulkGenerateRequest = await req.json();
    if (!plan_id) return NextResponse.json({ error: "plan_id required" }, { status: 400 });

    const authorizedPlan = await getAuthorizedPlan(plan_id);
    if (!authorizedPlan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    const supabase = getSupabaseAdminClient();

    // Fetch plan (simple select — no broken cross-table join)
    const { data: plan } = await supabase
      .from("marketing_plans")
      .select("id, site_id, status")
      .eq("id", plan_id)
      .single();

    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    // Fetch user profile for subscription tier + content limits
    const { data: userProfile } = await supabase
      .from("user_profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .single();

    const contentLimits: Record<string, number> = {
      free_trial: 10,
      starter: 30,
      growth: Infinity,
      agency: Infinity,
    };

    const tier = userProfile?.subscription_tier || "free_trial";
    const limit = contentLimits[tier];

    // Count existing generated content this month for this site
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    ).toISOString();

    const { count: existingCount } = await supabase
      .from("content_items")
      .select("id", { count: "exact" })
      .eq("site_id", plan.site_id)
      .neq("body", "")
      .gte("created_at", startOfMonth);

    const available = Math.max(0, limit - (existingCount || 0));
    if (available === 0) {
      return NextResponse.json(
        { error: `Monthly content limit reached (${limit}). Upgrade your plan.` },
        { status: 403 }
      );
    }

    // Fetch items that still need content
    const { data: items } = await supabase
      .from("content_items")
      .select("id, channel, content_type")
      .eq("plan_id", plan_id)
      .eq("body", "")
      .eq("status", "draft")
      .limit(available);

    if (!items || items.length === 0) {
      return NextResponse.json({ message: "All content already generated", generated: 0 });
    }

    // Fetch site's auto-approve settings
    const { data: siteRow } = await supabase
      .from("sites")
      .select("onboarding_json")
      .eq("id", plan.site_id)
      .single();
    const onboarding = (siteRow?.onboarding_json || null) as SiteOnboardingState | null;
    const autoApproveChannels = new Set<ContentChannel>(
      (onboarding?.auto_approve_channels || []) as ContentChannel[]
    );

    // Generate content for each item directly — no HTTP hop, no auth issues
    let generated = 0;
    let failed = 0;
    let autoApproved = 0;

    for (const item of items) {
      const result = await generateAndSaveContentItem(item.id, supabase);
      if (result.success) {
        generated++;
        // Auto-approve if the channel is configured for it
        if (autoApproveChannels.has(item.channel as ContentChannel)) {
          const publishResult = await publishContentItem(item.id, "auto_approve", supabase);
          if (publishResult.success) autoApproved++;
        }
      } else {
        failed++;
      }
      // Small delay to avoid hammering Claude API
      await new Promise((r) => setTimeout(r, 300));
    }

    // Log activity
    await supabase.from("activity_log").insert({
      site_id: plan.site_id,
      action: "bulk_generated",
      description: `Bulk generation complete: ${generated} pieces generated${autoApproved > 0 ? `, ${autoApproved} auto-approved` : ""}${failed > 0 ? `, ${failed} failed` : ""}`,
      metadata_json: { plan_id, generated, auto_approved: autoApproved, failed },
    });

    return NextResponse.json({ generated, autoApproved, failed, total: items.length });
  } catch (error) {
    logRouteError("api_bulk_generate_failed", error);
    return NextResponse.json({ error: "Bulk generation failed" }, { status: 500 });
  }
}
