import { describe, expect, it } from "vitest";
import { buildBusinessProfile, buildBusinessProfileSummary, normalizeBusinessProfile } from "@/lib/business-profile";
import { MergedAnalysis } from "@/lib/analyzers/types";
import { MarketingBrief } from "@/types";

const merged: MergedAnalysis = {
  sources: {
    website: {
      source: "website",
      url: "https://launchpilot.co",
      title: "LaunchPilot",
      description: "Autonomous growth engine",
      headings: ["Grow faster"],
      bodyText: "LaunchPilot helps bootstrapped founders grow.",
      features: ["strategy generation", "publishing automation"],
      pricing: "$79/month",
      testimonials: ["Loved by indie founders"],
      ctas: ["Start free trial"],
      techStack: ["Next.js"],
      raw: {},
    },
  },
  sourceCount: 1,
  primarySource: "website",
  merged: {
    businessName: "LaunchPilot",
    description: "Autonomous growth engine",
    offerings: ["strategy generation", "publishing automation"],
    targetAudience: "bootstrapped founders",
    existingChannels: ["website"],
    followerCounts: {},
    contentVoice: "professional",
    websiteUrl: "https://launchpilot.co",
    pricing: "$79/month",
    socialProof: ["Loved by indie founders"],
  },
};

const brief: MarketingBrief = {
  product_name: "LaunchPilot",
  one_liner: "Autonomous growth engine for founders",
  target_customer: "bootstrapped founders",
  pain_point: "They do not have time to market consistently.",
  value_proposition: "LaunchPilot turns strategy into execution and learning.",
  positioning: "Sharp, operator-first, pragmatic growth partner.",
  keywords: ["growth engine"],
  competitors: ["HubSpot"],
  recommended_channels: [{ channel: "blog", reasoning: "Own search intent", priority: 1 }],
  content_angles: ["founder-led growth loops"],
  existing_channels: ["website", "twitter"],
  channel_strengths: { twitter: "Strong founder distribution" },
  channel_gaps: { linkedin: "Missing B2B trust layer" },
  recommended_growth_surfaces: ["founder_social", "seo_content"],
  business_type: "saas",
  monetization_model: "subscription",
};

describe("business profile helpers", () => {
  it("builds a reusable business profile from merged analysis and brief", () => {
    const profile = buildBusinessProfile(merged, brief);
    expect(profile.business_name).toBe("LaunchPilot");
    expect(profile.business_type).toBe("saas");
    expect(profile.monetization_model).toBe("subscription");
    expect(profile.existing_channels).toContain("twitter");
    expect(profile.channel_strengths.twitter).toContain("founder");
  });

  it("builds a readable summary for downstream planning", () => {
    const summary = buildBusinessProfileSummary(buildBusinessProfile(merged, brief));
    expect(summary).toContain("LaunchPilot");
    expect(summary).toContain("bootstrapped founders");
    expect(summary).toContain("Recommended growth surfaces");
  });

  it("normalizes partial stored profiles so legacy rows do not crash the UI", () => {
    const normalized = normalizeBusinessProfile({
      business_name: "Legacy Site",
      target_audience: "Founders",
      offerings: undefined,
      existing_channels: undefined,
      social_proof: undefined,
    });

    expect(normalized).not.toBeNull();
    expect(normalized?.offerings).toEqual([]);
    expect(normalized?.existing_channels).toEqual([]);
    expect(normalized?.social_proof).toEqual([]);
  });
});
