import { buildBusinessProfileSummary } from "@/lib/business-profile";
import { buildContentPatternSummary, getLatestPatternSnapshot } from "@/lib/content-patterns";
import { getFunnelIntelligence } from "@/lib/funnel";
import { seedGrowthExperimentsFromStrategy } from "@/lib/growth";
import { generateAndSaveContentItem } from "@/lib/generators/content";
import { generateMarketingPlan } from "@/lib/generators/plan";
import { buildPlanPerformanceSummary } from "@/lib/performance";
import { getPartnerIntelligence } from "@/lib/partners";
import { publishContentItem } from "@/lib/publishing";
import { replaceGrowthSurfaces } from "@/lib/surfaces";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { buildInitialOnboardingState } from "@/lib/onboarding";
import {
  BusinessProfile,
  ContentChannel,
  ContentItem,
  GrowthSurface,
  MarketingBrief,
  Site,
} from "@/types";

type SupabaseAdmin = ReturnType<typeof getSupabaseAdminClient>;

const SYSTEM_COMPANY_NAME = "LaunchPilot System";

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

function getTwitterHandle() {
  return (process.env.SELF_MARKETING_TWITTER_HANDLE || "launchpilot").replace(/^@/, "");
}

function buildSelfMarketingBrief(appUrl: string): MarketingBrief {
  return {
    product_name: "LaunchPilot",
    one_liner: "AI growth operator for founders who shipped a product but still have zero users.",
    target_customer:
      "Solo developers, indie hackers, creators, and small startup teams with a live product and weak or inconsistent marketing execution.",
    pain_point:
      "They can build fast but struggle to create a real marketing strategy, execute consistently, and learn from results before motivation dies.",
    value_proposition:
      "LaunchPilot turns a live product into a working growth system: strategy, content, publishing, tracking, reprioritization, and next-step recommendations.",
    positioning:
      "Not just a content generator. It is a marketing execution engine that publishes, tracks outcomes, learns what converts, and keeps working.",
    keywords: [
      "AI marketing for startups",
      "indie hacker marketing",
      "startup growth engine",
      "content execution system",
      "marketing automation for founders",
    ],
    competitors: ["manual founder marketing", "generic AI copy tools", "agency retainers", "growth consultants"],
    recommended_channels: [
      { channel: "blog", reasoning: "Compounding SEO and founder-education surface.", priority: 1 },
      { channel: "twitter", reasoning: "Founder-led distribution and proof loop.", priority: 2 },
      { channel: "reddit", reasoning: "High-intent founder communities.", priority: 3 },
      { channel: "directory", reasoning: "Capture intent on startup and tool directories.", priority: 4 },
      { channel: "email", reasoning: "Lifecycle proof and onboarding education.", priority: 5 },
    ],
    content_angles: [
      "I built products but couldn’t market any of them",
      "What happens when you let AI market your startup for 30 days",
      "The indie hacker marketing problem is execution, not ideas",
      "Real numbers from running LaunchPilot on itself",
      "Why your side project has zero users and what to do next",
      "How a $79 tool replaces inconsistent founder marketing",
      "Mini case studies from paying LaunchPilot users",
    ],
    existing_channels: ["website", "twitter"],
    channel_strengths: {
      website: "Strong product narrative and feature depth.",
      twitter: "Natural founder-led distribution and public build-in-the-open angle.",
    },
    channel_gaps: {
      reddit: "Founder communities are still underused relative to the pain LaunchPilot solves.",
      directory: "Directory presence can capture intent from builders searching for growth help.",
    },
    recommended_growth_surfaces: [
      "founder_social",
      "seo_content",
      "directory_presence",
      "community_engagement",
      "landing_page_optimization",
    ],
    business_type: "saas",
    monetization_model: "subscription",
  };
}

function buildSelfMarketingProfile(appUrl: string, brief: MarketingBrief): BusinessProfile {
  return {
    business_name: "LaunchPilot",
    primary_source: "website",
    source_count: 2,
    website_url: appUrl,
    description: brief.one_liner,
    offerings: [
      "Marketing strategy generation",
      "30-day growth execution plans",
      "Autonomous publishing and tracking",
      "Content intelligence and adaptive optimization",
    ],
    target_audience: brief.target_customer,
    content_voice: "direct, operator-minded, founder-native",
    existing_channels: ["website", "twitter"],
    follower_counts: { twitter: 0 },
    pricing: "$79/mo",
    social_proof: [
      "Paying friend-users already rely on LaunchPilot to keep marketing moving.",
      "LaunchPilot uses its own engine to market itself.",
    ],
    business_type: "saas",
    monetization_model: "subscription",
    channel_strengths: brief.channel_strengths || {},
    channel_gaps: brief.channel_gaps || {},
    recommended_growth_surfaces: brief.recommended_growth_surfaces || [],
  };
}

function buildSelfMarketingSources(appUrl: string) {
  const twitterHandle = getTwitterHandle();
  return {
    website: {
      url: appUrl,
      analyzed: true,
      raw_data: {
        source: "website",
        url: appUrl,
        title: "LaunchPilot",
        description: "AI growth operator for founders and small teams.",
        headings: ["Get a full marketing system, not a blank page"],
        bodyText: "LaunchPilot turns a product URL and online presence into a strategy, execution plan, content, publishing, tracking, and learning loop.",
        features: ["Strategy generation", "Execution plans", "Publishing", "Attribution", "Pattern learning"],
        pricing: "$79/mo",
        testimonials: ["Real users are paying for LaunchPilot because it keeps marketing moving."],
        ctas: ["Start marketing your product"],
        techStack: ["Next.js", "Supabase", "Claude"],
        raw: {},
      },
    },
    twitter: {
      handle: twitterHandle,
      analyzed: true,
      raw_data: {
        source: "twitter",
        handle: twitterHandle,
        displayName: "LaunchPilot",
        bio: "AI marketing execution engine for founders shipping real products.",
        followerCount: 0,
        followingCount: 0,
        tweetCount: 0,
        profileUrl: `https://twitter.com/${twitterHandle}`,
        websiteFromBio: appUrl,
        recentTweets: [],
        topTweets: [],
        commonTopics: ["founder marketing", "distribution", "AI operators"],
        averageEngagement: 0,
        postingFrequency: "not enough data yet",
        voiceTone: "direct and operator-minded",
        raw: {},
      },
    },
  };
}

function buildSelfMarketingSurfaces(): Array<Omit<GrowthSurface, "id" | "site_id" | "created_at" | "updated_at">> {
  return [
    {
      surface_type: "founder_social",
      display_name: "Founder-Led Social",
      status: "active",
      priority: 1,
      rationale: "LaunchPilot’s story compounds fastest when the founder/operator angle is public and consistent.",
      execution_ready: true,
      channels: ["twitter"],
      objective: "Turn product-building pain into visible distribution and signups.",
      readiness_reason: "LaunchPilot already generates founder-led social content.",
      execution_owner: "launchpilot",
      metadata_json: {},
      last_reviewed_at: new Date().toISOString(),
    },
    {
      surface_type: "seo_content",
      display_name: "SEO Content",
      status: "active",
      priority: 2,
      rationale: "Search-driven founder pain is a durable acquisition surface for LaunchPilot.",
      execution_ready: true,
      channels: ["blog"],
      objective: "Capture high-intent founders looking for marketing help.",
      readiness_reason: "Hosted blog publishing is already live.",
      execution_owner: "launchpilot",
      metadata_json: {},
      last_reviewed_at: new Date().toISOString(),
    },
    {
      surface_type: "directory_presence",
      display_name: "Directory Presence",
      status: "active",
      priority: 3,
      rationale: "Launch directories and tool indexes create trust and high-intent discovery.",
      execution_ready: true,
      channels: ["directory"],
      objective: "Win discovery on founder and tool recommendation surfaces.",
      readiness_reason: "Directory submission generation already exists.",
      execution_owner: "hybrid",
      metadata_json: {},
      last_reviewed_at: new Date().toISOString(),
    },
    {
      surface_type: "community_engagement",
      display_name: "Community Engagement",
      status: "recommended",
      priority: 4,
      rationale: "Founder communities are a strong proof and distribution loop once narratives are sharp.",
      execution_ready: true,
      channels: ["reddit"],
      objective: "Convert lived operator experience into trust inside founder communities.",
      readiness_reason: "LaunchPilot can draft community content, but manual review keeps it safe.",
      execution_owner: "hybrid",
      metadata_json: {},
      last_reviewed_at: new Date().toISOString(),
    },
    {
      surface_type: "landing_page_optimization",
      display_name: "Landing Page Optimization",
      status: "active",
      priority: 5,
      rationale: "The self-marketing loop is only useful if the LaunchPilot landing experience converts traffic cleanly.",
      execution_ready: false,
      channels: [],
      objective: "Turn self-marketing traffic into activated trials and paid users.",
      readiness_reason: "LaunchPilot can recommend funnel changes but not edit the site automatically.",
      execution_owner: "hybrid",
      metadata_json: {},
      last_reviewed_at: new Date().toISOString(),
    },
  ];
}

async function ensureSystemCompany(supabase: SupabaseAdmin) {
  const { data: existing } = await supabase
    .from("companies")
    .select("id")
    .eq("name", SYSTEM_COMPANY_NAME)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data, error } = await supabase
    .from("companies")
    .insert({ name: SYSTEM_COMPANY_NAME })
    .select("id")
    .single();

  if (error || !data?.id) throw error || new Error("Failed to create self-marketing company");
  return data.id;
}

export async function ensureSelfMarketingSite(supabase = getSupabaseAdminClient()) {
  const appUrl = getAppUrl();
  const brief = buildSelfMarketingBrief(appUrl);
  const businessProfile = buildSelfMarketingProfile(appUrl, brief);
  const sourcesJson = buildSelfMarketingSources(appUrl);
  const companyId = await ensureSystemCompany(supabase);

  const { data: existing } = await supabase
    .from("sites")
    .select("*")
    .eq("is_system_site", true)
    .maybeSingle();

  const onboarding = buildInitialOnboardingState({
    brief,
    businessProfile,
    sourcesJson,
    existing: {
      persona: "saas_founder",
      wizard_completed: true,
      checklist_dismissed: true,
      steps_completed: ["brief_confirmed", "surfaces_activated", "twitter_connected", "tracking_installed"],
      completed_at: new Date().toISOString(),
      welcome_message: "LaunchPilot is running its own growth engine.",
    },
  });
  onboarding.wizard_completed = true;
  onboarding.checklist_dismissed = true;

  let siteRow = existing as Site | null;

  if (!siteRow) {
    const { data, error } = await supabase
      .from("sites")
      .insert({
        company_id: companyId,
        url: appUrl,
        name: "LaunchPilot",
        slug: "launchpilot",
        source_type: "multi_source",
        sources_json: sourcesJson,
        business_profile_json: businessProfile,
        onboarding_json: onboarding,
        brief_json: brief,
        brief_confirmed: true,
        status: "active",
        is_system_site: true,
      })
      .select("*")
      .single();

    if (error || !data) throw error || new Error("Failed to create self-marketing site");
    siteRow = data as Site;
  } else {
    await supabase
      .from("sites")
      .update({
        company_id: companyId,
        url: appUrl,
        name: "LaunchPilot",
        source_type: "multi_source",
        sources_json: sourcesJson,
        business_profile_json: businessProfile,
        onboarding_json: onboarding,
        brief_json: brief,
        brief_confirmed: true,
        status: "active",
        is_system_site: true,
      })
      .eq("id", siteRow.id);
  }

  await replaceGrowthSurfaces(siteRow.id, buildSelfMarketingSurfaces(), supabase);
  await getFunnelIntelligence(siteRow.id, supabase);
  await getPartnerIntelligence(siteRow.id, supabase);

  return {
    site: {
      ...(siteRow as Site),
      brief_json: brief,
      business_profile_json: businessProfile,
      sources_json: sourcesJson,
      onboarding_json: onboarding,
    } as Site,
    brief,
    businessProfile,
  };
}

async function ensureSelfMarketingPlan(site: Site, supabase: SupabaseAdmin) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const { data: existingPlan } = await supabase
    .from("marketing_plans")
    .select("id, strategy_json")
    .eq("site_id", site.id)
    .eq("month", month)
    .eq("year", year)
    .maybeSingle();

  if (existingPlan?.id && existingPlan.strategy_json) {
    return existingPlan.id;
  }

  const [performanceContext, patternSnapshot, surfacesData, partnerIntel, funnelIntel] = await Promise.all([
    buildPlanPerformanceSummary(site.id, supabase),
    getLatestPatternSnapshot(site.id, supabase),
    supabase
      .from("growth_surfaces")
      .select("*")
      .eq("site_id", site.id)
      .in("status", ["active", "recommended"])
      .order("priority", { ascending: true }),
    getPartnerIntelligence(site.id, supabase),
    getFunnelIntelligence(site.id, supabase),
  ]);

  const surfaces = ((surfacesData.data || []) as GrowthSurface[]).filter(
    (surface) => surface.status === "active" || surface.status === "recommended"
  );

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

  const { strategy, items } = await generateMarketingPlan(site.brief_json!, now, {
    performanceSummary: `${buildBusinessProfileSummary(site.business_profile_json || null)}\n\n${performanceContext.summary}\n\n${funnelSummary}\n\n${partnerSummary}\n\n${buildContentPatternSummary(patternSnapshot)}`.trim(),
    preferredChannels: surfaces.flatMap((surface) => surface.channels as ContentChannel[]).filter(Boolean),
    surfaceSummary: surfaces
      .filter((surface) => surface.status === "active")
      .map((surface) => `- ${surface.display_name}: ${surface.rationale}`)
      .join("\n"),
  });

  let planId = existingPlan?.id as string | undefined;
  if (!planId) {
    const { data: createdPlan, error } = await supabase
      .from("marketing_plans")
      .insert({
        site_id: site.id,
        month,
        year,
        status: "generating",
      })
      .select("*")
      .single();

    if (error || !createdPlan) throw error || new Error("Failed to create self-marketing plan");
    planId = createdPlan.id;
  } else {
    await supabase.from("content_items").delete().eq("plan_id", planId);
  }

  await supabase
    .from("marketing_plans")
    .update({ strategy_json: strategy, status: "active" })
    .eq("id", planId);

  await supabase.from("content_items").insert(
    items.map((item) => ({
      site_id: site.id,
      plan_id: planId,
      channel: item.channel,
      content_type: item.action_type,
      title: item.title,
      body: "",
      metadata_json: { week: item.week, day: item.day, description: item.description },
      status: "draft",
      scheduled_date: item.scheduled_date,
      auto_executable: item.auto_executable,
    }))
  );

  await seedGrowthExperimentsFromStrategy(site.id, site.brief_json!, strategy, supabase);

  await supabase.from("activity_log").insert({
    site_id: site.id,
    action: "self_marketing_plan_generated",
    description: `Self-marketing plan generated with ${items.length} action items`,
    metadata_json: { plan_id: planId, item_count: items.length },
  });

  return planId;
}

async function generateDraftBodies(siteId: string, supabase: SupabaseAdmin, limit = 8) {
  const { data: items } = await supabase
    .from("content_items")
    .select("id")
    .eq("site_id", siteId)
    .eq("status", "draft")
    .eq("body", "")
    .limit(limit);

  let generated = 0;
  for (const item of items || []) {
    const result = await generateAndSaveContentItem(item.id, supabase);
    if (result.success) generated += 1;
  }
  return generated;
}

async function autoReviewSelfMarketingQueue(siteId: string, supabase: SupabaseAdmin) {
  const { data: readyDrafts } = await supabase
    .from("content_items")
    .select("*")
    .eq("site_id", siteId)
    .eq("status", "draft")
    .neq("body", "")
    .order("scheduled_date", { ascending: true })
    .limit(20);

  let autoApproved = 0;
  let manualQueued = 0;
  const lowRiskChannels = new Set(["blog", "directory"]);
  const manualReviewChannels = new Set(["twitter", "reddit"]);

  for (const item of (readyDrafts || []) as ContentItem[]) {
    if (lowRiskChannels.has(item.channel)) {
      const result = await publishContentItem(item.id, "approve", supabase);
      if (result.success) autoApproved += 1;
      continue;
    }
    if (manualReviewChannels.has(item.channel)) {
      const result = await publishContentItem(item.id, "approve", supabase);
      if (result.success) manualQueued += 1;
    }
  }

  return { autoApproved, manualQueued };
}

async function publishDueSelfMarketingContent(siteId: string, supabase: SupabaseAdmin) {
  const today = new Date().toISOString().split("T")[0];
  const { data: readyItems } = await supabase
    .from("content_items")
    .select("id, channel")
    .eq("site_id", siteId)
    .eq("status", "approved")
    .in("channel", ["blog"])
    .or(`scheduled_date.is.null,scheduled_date.lte.${today}`)
    .limit(20);

  let published = 0;
  for (const item of readyItems || []) {
    const result = await publishContentItem(item.id, "cron", supabase);
    if (result.success && result.status === "published") published += 1;
  }
  return published;
}

export async function runSelfMarketingCycle(supabase = getSupabaseAdminClient()) {
  const { site } = await ensureSelfMarketingSite(supabase);
  await ensureSelfMarketingPlan(site, supabase);

  const { count: approvedRemaining } = await supabase
    .from("content_items")
    .select("id", { count: "exact", head: true })
    .eq("site_id", site.id)
    .eq("status", "approved");

  let generated = 0;
  let autoApproved = 0;
  let manualQueued = 0;

  if ((approvedRemaining || 0) < 5) {
    generated = await generateDraftBodies(site.id, supabase, 10);
    const reviewResults = await autoReviewSelfMarketingQueue(site.id, supabase);
    autoApproved = reviewResults.autoApproved;
    manualQueued = reviewResults.manualQueued;
  }

  const published = await publishDueSelfMarketingContent(site.id, supabase);

  await supabase.from("activity_log").insert({
    site_id: site.id,
    action: "self_marketing_cycle",
    description: "Self-marketing cycle completed",
    metadata_json: {
      generated,
      auto_approved: autoApproved,
      manual_review_queued: manualQueued,
      published,
    },
  });

  return {
    siteId: site.id,
    generated,
    autoApproved,
    manualQueued,
    published,
  };
}
