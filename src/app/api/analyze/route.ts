import { NextRequest, NextResponse } from "next/server";
import { getAuthorizedSite, getCurrentUserCompanyId, getUser, getSupabaseAdminClient } from "@/lib/supabase";
import { analyzeAllSources } from "@/lib/analyzers/orchestrator";
import { MergedAnalysis, SourceInputs } from "@/lib/analyzers/types";
import { callClaude, calculateCost } from "@/lib/claude";
import { buildBusinessProfile } from "@/lib/business-profile";
import { inferSiteSourceType, normalizeHandle } from "@/lib/intake";
import { logRouteError, logStructured } from "@/lib/observability";
import { analyzeRequestSchema } from "@/lib/validation";
import { AnalyzeRequest, MarketingBrief } from "@/types";
import { PRICING_PLANS } from "@/lib/stripe";

function buildPrimaryUrl(inputs: SourceInputs, merged: MergedAnalysis) {
  if (inputs.website) return inputs.website.startsWith("http") ? inputs.website : `https://${inputs.website}`;
  if (inputs.twitter) return `https://x.com/${normalizeHandle(inputs.twitter)}`;
  if (inputs.instagram) return `https://www.instagram.com/${normalizeHandle(inputs.instagram)}/`;
  if (inputs.linkedin) return inputs.linkedin.startsWith("http") ? inputs.linkedin : `https://${inputs.linkedin}`;
  return merged.merged.websiteUrl || "";
}

function buildSourcesJson(inputs: SourceInputs, merged: MergedAnalysis) {
  return {
    ...(inputs.website
      ? {
          website: {
            url: buildPrimaryUrl({ website: inputs.website }, merged),
            analyzed: !!merged.sources.website,
            raw_data: merged.sources.website || {},
          },
        }
      : {}),
    ...(inputs.twitter
      ? {
          twitter: {
            handle: normalizeHandle(inputs.twitter),
            analyzed: !!merged.sources.twitter,
            raw_data: merged.sources.twitter || {},
          },
        }
      : {}),
    ...(inputs.instagram
      ? {
          instagram: {
            handle: normalizeHandle(inputs.instagram),
            analyzed: !!merged.sources.instagram,
            raw_data: merged.sources.instagram || {},
          },
        }
      : {}),
    ...(inputs.linkedin
      ? {
          linkedin: {
            url: inputs.linkedin.startsWith("http") ? inputs.linkedin : `https://${inputs.linkedin}`,
            analyzed: !!merged.sources.linkedin,
            raw_data: merged.sources.linkedin || {},
          },
        }
      : {}),
  };
}

async function generateBriefFromMergedAnalysis(merged: MergedAnalysis) {
  const result = await callClaude<MarketingBrief>({
    model: "sonnet",
    systemPrompt:
      "You are BreakthroughPilot, an expert marketing strategist. Analyze businesses from multi-source online presence data. Return valid JSON only.",
    userPrompt: `Analyze this business based on the following online presence data and generate a marketing brief.

## Available Data Sources
${merged.sources.website ? `### Website Analysis
${JSON.stringify(merged.sources.website, null, 2)}
` : ""}
${merged.sources.twitter ? `### Twitter/X Profile
${JSON.stringify(merged.sources.twitter, null, 2)}
` : ""}
${merged.sources.instagram ? `### Instagram Profile
${JSON.stringify(merged.sources.instagram, null, 2)}
` : ""}
${merged.sources.linkedin ? `### LinkedIn Profile
${JSON.stringify(merged.sources.linkedin, null, 2)}
` : ""}

### Merged Business Signals
${JSON.stringify(merged.merged, null, 2)}

Based on ALL available signals, generate a marketing brief. If multiple sources conflict, prefer the richest source.

Return JSON with this exact structure:
{
  "product_name": "The product or business name",
  "one_liner": "One sentence describing what it does",
  "target_customer": "Specific persona who needs this",
  "pain_point": "The exact frustrating problem this solves",
  "value_proposition": "Why someone should pay for this vs alternatives",
  "positioning": "How to talk about this product — tone, angle, key phrases to use",
  "keywords": ["15-20 SEO keywords"],
  "competitors": ["3-6 likely competitors"],
  "recommended_channels": [
    {
      "channel": "blog|twitter|reddit|email|tiktok|directory",
      "reasoning": "Why this channel works for this business",
      "priority": 1
    }
  ],
  "content_angles": ["10 specific content ideas"],
  "existing_channels": ["website", "twitter"],
  "channel_strengths": { "twitter": "What they already do well there" },
  "channel_gaps": { "instagram": "What's missing or underutilized" },
  "recommended_growth_surfaces": ["founder-led Twitter", "SEO blog"],
  "business_type": "saas|creator|ecommerce|service|agency|local|marketplace|other",
  "monetization_model": "subscription|one-time|freemium|ad-supported|service-fee|physical-product|other",
  "subreddit_research": []
}`,
    maxTokens: 2600,
    retries: 0,
  });

  return result;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawBody = (await req.json().catch(() => ({}))) as AnalyzeRequest;
    const parsed = analyzeRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid analysis request", issues: parsed.error.flatten() }, { status: 400 });
    }

    const body = parsed.data as AnalyzeRequest;
    const { url, site_id } = body;
    const sources: SourceInputs =
      body.sources && Object.values(body.sources).some(Boolean)
        ? body.sources
        : url
          ? { website: url }
          : {};

    if (!Object.values(sources).some((value) => Boolean(value))) {
      return NextResponse.json({ error: "At least one source is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();

    const companyId = await getCurrentUserCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    // Check site limits
    const { data: existingSites } = await supabase
      .from("sites")
      .select("id")
      .eq("company_id", companyId);

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .single();

    const tier = profile?.subscription_tier || "free_trial";
    const plan = PRICING_PLANS.find((p) => p.id === tier);
    const limit = tier === "free_trial" ? 1 : (plan?.limits.sites ?? 1);
    if (!site_id && (existingSites?.length || 0) >= limit) {
      return NextResponse.json(
        { error: `Your plan allows ${limit} site(s). Upgrade to add more.` },
        { status: 403 }
      );
    }

    const sourceType = inferSiteSourceType(sources);

    const initialUrl = sources.website
      ? (sources.website.startsWith("http") ? sources.website : `https://${sources.website}`)
      : sources.twitter
        ? `https://x.com/${normalizeHandle(sources.twitter)}`
        : sources.instagram
          ? `https://www.instagram.com/${normalizeHandle(sources.instagram)}/`
          : sources.linkedin?.startsWith("http")
            ? sources.linkedin
            : `https://${sources.linkedin}`;

    // Create or update site record with "analyzing" status
    let siteId = site_id;
    if (!siteId) {
      const { data: newSite, error: siteError } = await supabase
        .from("sites")
        .insert({
          company_id: companyId,
          url: initialUrl,
          name: initialUrl,
          source_type: sourceType,
          sources_json: {},
          status: "analyzing",
        })
        .select()
        .single();

      if (siteError) throw siteError;
      siteId = newSite.id;
    } else {
      const authorizedSite = await getAuthorizedSite(siteId);
      if (!authorizedSite) {
        return NextResponse.json({ error: "Site not found" }, { status: 404 });
      }

      await supabase
        .from("sites")
        .update({ status: "analyzing", source_type: sourceType })
        .eq("id", siteId);
    }

    const merged = await analyzeAllSources(sources, { siteId });
    if (merged.sourceCount === 0) {
      await supabase.from("sites").update({ status: "error" }).eq("id", siteId);
      logStructured("warn", "analysis_failed_no_sources", {
        site_id: siteId,
        source_type: sourceType,
      });
      return NextResponse.json({ error: "Could not analyze any provided sources." }, { status: 422 });
    }

    const primaryUrl = buildPrimaryUrl(sources, merged);
    const sourcesJson = buildSourcesJson(sources, merged);
    const result = await generateBriefFromMergedAnalysis(merged);
    const businessProfile = buildBusinessProfile(merged, result.data);

    await supabase
      .from("sites")
      .update({
        brief_json: result.data,
        business_profile_json: businessProfile,
        name: result.data.product_name || merged.merged.businessName,
        url: primaryUrl || initialUrl,
        source_type: sourceType,
        sources_json: sourcesJson,
        status: "active",
        brief_confirmed: false,
      })
      .eq("id", siteId);

    const cost = calculateCost(result.model, result.input_tokens, result.output_tokens);
    await supabase.from("activity_log").insert({
      site_id: siteId,
      action: "site_analyzed",
      description: `Business analyzed from ${merged.sourceCount} source${merged.sourceCount === 1 ? "" : "s"} — identified as "${result.data.product_name}"`,
      metadata_json: {
        source_type: sourceType,
        source_count: merged.sourceCount,
        primary_source: merged.primarySource,
        input_tokens: result.input_tokens,
        output_tokens: result.output_tokens,
        cost_usd: cost,
        model: result.model,
      },
    });

    logStructured("info", "site_analyzed", {
      site_id: siteId,
      source_type: sourceType,
      source_count: merged.sourceCount,
      primary_source: merged.primarySource,
    });

    return NextResponse.json({
      brief: result.data,
      site_id: siteId,
      sources_json: sourcesJson,
      source_type: sourceType,
    });
  } catch (error) {
    logRouteError("api_analyze_failed", error);
    return NextResponse.json(
      { error: "Analysis failed. Please try again." },
      { status: 500 }
    );
  }
}
