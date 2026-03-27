import { describe, expect, it } from "vitest";
import {
  buildInitialOnboardingState,
  detectPersona,
  getPersonaChannelOrder,
  sortLabelsForPersona,
} from "@/lib/onboarding";
import { BusinessProfile, MarketingBrief } from "@/types";

const baseBrief: MarketingBrief = {
  product_name: "LaunchPilot",
  one_liner: "AI marketing operator",
  target_customer: "Founders with live products",
  pain_point: "They have no repeatable growth system",
  value_proposition: "Generates strategy, content, publishing, and learning loops",
  positioning: "Execution engine for startup marketing",
  keywords: [],
  competitors: [],
  recommended_channels: [],
  content_angles: [],
  business_type: "saas",
  monetization_model: "subscription",
};

const baseProfile: BusinessProfile = {
  business_name: "LaunchPilot",
  primary_source: "website",
  source_count: 2,
  website_url: "https://launchpilot.co",
  description: "AI marketing operator",
  offerings: ["strategy"],
  target_audience: "Founders",
  content_voice: "direct",
  existing_channels: ["website", "twitter"],
  follower_counts: { twitter: 100 },
  pricing: "$79/mo",
  social_proof: [],
  business_type: "saas",
  monetization_model: "subscription",
  channel_strengths: {},
  channel_gaps: {},
  recommended_growth_surfaces: [],
};

describe("onboarding helpers", () => {
  it("detects saas founder from website-first saas signals", () => {
    const persona = detectPersona({
      brief: baseBrief,
      businessProfile: baseProfile,
      sourcesJson: {
        website: { analyzed: true },
        twitter: { analyzed: true },
      },
    });

    expect(persona).toBe("saas_founder");
  });

  it("detects creator for social-only businesses", () => {
    const persona = detectPersona({
      brief: { ...baseBrief, business_type: "creator" },
      businessProfile: { ...baseProfile, business_type: "creator", website_url: null },
      sourcesJson: {
        instagram: { analyzed: true },
      },
    });

    expect(persona).toBe("creator");
  });

  it("builds onboarding state with brief confirmed step", () => {
    const onboarding = buildInitialOnboardingState({
      brief: baseBrief,
      businessProfile: baseProfile,
      sourcesJson: { website: { analyzed: true } },
    });

    expect(onboarding.persona).toBe("saas_founder");
    expect(onboarding.steps_completed).toContain("brief_confirmed");
    expect(onboarding.welcome_message).toBeTruthy();
  });

  it("returns persona-specific channel order", () => {
    expect(getPersonaChannelOrder("creator").slice(0, 2)).toEqual(["twitter", "tiktok"]);
  });

  it("sorts navigation labels for persona relevance", () => {
    const items = [
      { label: "Performance" },
      { label: "Approval Queue" },
      { label: "Marketing Brief" },
    ];

    const sorted = sortLabelsForPersona(items, "creator");
    expect(sorted.map((item) => item.label)).toEqual([
      "Approval Queue",
      "Performance",
      "Marketing Brief",
    ]);
  });
});
