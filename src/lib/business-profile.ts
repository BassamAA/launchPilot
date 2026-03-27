import { MergedAnalysis } from "@/lib/analyzers/types";
import { BusinessProfile, MarketingBrief } from "@/types";
import { BRAND_NAME } from "@/lib/brand";

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function buildChannelStrengths(
  brief: MarketingBrief | null | undefined,
  merged: MergedAnalysis
) {
  if (brief?.channel_strengths && Object.keys(brief.channel_strengths).length > 0) {
    return brief.channel_strengths;
  }

  const strengths: Record<string, string> = {};
  if (merged.sources.twitter?.followerCount) {
    strengths.twitter = `Already has ${merged.sources.twitter.followerCount.toLocaleString()} followers and an identifiable voice.`;
  }
  if (merged.sources.website?.description) {
    strengths.website = "Has enough on-site messaging to extract positioning and offer detail.";
  }
  if (merged.sources.instagram?.manualInput?.mainOffering || merged.sources.instagram?.bio) {
    strengths.instagram = `Gives ${BRAND_NAME} visual-brand and audience clues even before direct execution exists.`;
  }
  if (merged.sources.linkedin?.headline || merged.sources.linkedin?.description) {
    strengths.linkedin = "Adds professional positioning and category context for B2B or expert-led businesses.";
  }
  return strengths;
}

function buildChannelGaps(
  brief: MarketingBrief | null | undefined,
  merged: MergedAnalysis
) {
  if (brief?.channel_gaps && Object.keys(brief.channel_gaps).length > 0) {
    return brief.channel_gaps;
  }

  const present = new Set(merged.merged.existingChannels);
  const gaps: Record<string, string> = {};
  if (!present.has("website")) {
    gaps.website = "No owned web destination detected, which limits conversion control and SEO leverage.";
  }
  if (!present.has("twitter")) {
    gaps.twitter = "Founder-led social presence is missing or too light to use as a distribution wedge yet.";
  }
  if (!present.has("instagram")) {
    gaps.instagram = "Visual social proof and short-form social discovery are underrepresented.";
  }
  if (!present.has("linkedin")) {
    gaps.linkedin = "Professional trust-building and B2B positioning are not yet clearly represented.";
  }
  return gaps;
}

export function buildBusinessProfile(
  merged: MergedAnalysis,
  brief?: MarketingBrief | null
): BusinessProfile {
  return {
    business_name: brief?.product_name || merged.merged.businessName,
    primary_source: merged.primarySource,
    source_count: merged.sourceCount,
    website_url: merged.merged.websiteUrl,
    description: brief?.one_liner || merged.merged.description,
    offerings: unique(merged.merged.offerings).slice(0, 8),
    target_audience: brief?.target_customer || merged.merged.targetAudience,
    content_voice: merged.merged.contentVoice,
    existing_channels: unique(brief?.existing_channels || merged.merged.existingChannels),
    follower_counts: merged.merged.followerCounts,
    pricing: merged.merged.pricing,
    social_proof: unique(merged.merged.socialProof).slice(0, 8),
    business_type: brief?.business_type || null,
    monetization_model: brief?.monetization_model || null,
    channel_strengths: buildChannelStrengths(brief, merged),
    channel_gaps: buildChannelGaps(brief, merged),
    recommended_growth_surfaces: unique(brief?.recommended_growth_surfaces || []),
  };
}

export function normalizeBusinessProfile(
  profile: Partial<BusinessProfile> | null | undefined
): BusinessProfile | null {
  if (!profile) return null;

  return {
    business_name: profile.business_name || "Unknown business",
    primary_source: profile.primary_source || "website",
    source_count: typeof profile.source_count === "number" ? profile.source_count : 0,
    website_url: profile.website_url || null,
    description: profile.description || "",
    offerings: Array.isArray(profile.offerings) ? profile.offerings : [],
    target_audience: profile.target_audience || "",
    content_voice: profile.content_voice || "direct",
    existing_channels: Array.isArray(profile.existing_channels) ? profile.existing_channels : [],
    follower_counts: profile.follower_counts || {},
    pricing: profile.pricing || null,
    social_proof: Array.isArray(profile.social_proof) ? profile.social_proof : [],
    business_type: profile.business_type || null,
    monetization_model: profile.monetization_model || null,
    channel_strengths: profile.channel_strengths || {},
    channel_gaps: profile.channel_gaps || {},
    recommended_growth_surfaces: Array.isArray(profile.recommended_growth_surfaces)
      ? profile.recommended_growth_surfaces
      : [],
  };
}

export function buildBusinessProfileSummary(profile: BusinessProfile | null | undefined) {
  const normalized = normalizeBusinessProfile(profile);
  if (!normalized) return "";

  const strengths = Object.entries(normalized.channel_strengths)
    .map(([channel, summary]) => `- ${channel}: ${summary}`)
    .join("\n");
  const gaps = Object.entries(normalized.channel_gaps)
    .map(([channel, summary]) => `- ${channel}: ${summary}`)
    .join("\n");

  return `Business profile:
- Name: ${normalized.business_name}
- Primary source: ${normalized.primary_source}
- Source count: ${normalized.source_count}
- Business type: ${normalized.business_type || "unknown"}
- Monetization: ${normalized.monetization_model || "unknown"}
- Website: ${normalized.website_url || "none detected"}
- Audience: ${normalized.target_audience || "unknown"}
- Voice: ${normalized.content_voice}
- Existing channels: ${normalized.existing_channels.join(", ") || "none"}
- Offerings: ${normalized.offerings.join(", ") || "not enough data"}
- Social proof: ${normalized.social_proof.join(", ") || "none yet"}
${strengths ? `\nChannel strengths:\n${strengths}` : ""}
${gaps ? `\nChannel gaps:\n${gaps}` : ""}
${normalized.recommended_growth_surfaces.length ? `\nRecommended growth surfaces:\n- ${normalized.recommended_growth_surfaces.join("\n- ")}` : ""}`.trim();
}
