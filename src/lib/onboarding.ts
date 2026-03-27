import {
  BusinessProfile,
  ContentChannel,
  GrowthSurfaceType,
  MarketingBrief,
  OnboardingConfig,
  OnboardingPersona,
  OnboardingStepKey,
  Site,
  SiteOnboardingState,
} from "@/types";

type SourceRecord = Record<string, unknown> | null | undefined;

const PERSONA_CONFIG: Record<OnboardingPersona, Omit<OnboardingConfig, "persona">> = {
  saas_founder: {
    primarySources: ["website", "twitter"],
    suggestedSurfaces: ["seo_content", "founder_social", "directory_presence", "community_engagement"],
    skipSurfaces: ["short_form_video"],
    welcomeMessage: "LaunchPilot sees a SaaS-style business. The fastest win is shipping a sharp acquisition wedge and consistent founder-led distribution.",
    quickWins: [
      "Publish your first blog post",
      "Submit to three directories",
      "Schedule a week of founder-led posts",
    ],
    featuresToHighlight: ["content_queue", "seo_blog", "attribution"],
    featuresToDefer: ["partner_intelligence", "funnel_intelligence"],
  },
  creator: {
    primarySources: ["instagram", "twitter", "linkedin"],
    suggestedSurfaces: ["founder_social", "short_form_video", "community_engagement"],
    skipSurfaces: ["cold_outbound", "seo_content"],
    welcomeMessage: "LaunchPilot sees a creator-led business. The first win is building a repeatable publishing rhythm and learning which hooks convert.",
    quickWins: [
      "Generate your first week of social posts",
      "Connect Twitter for faster publishing",
      "Review the first content pattern insights",
    ],
    featuresToHighlight: ["content_queue", "content_intelligence", "twitter_publishing"],
    featuresToDefer: ["seo_content", "cold_outbound", "partner_intelligence"],
  },
  service_provider: {
    primarySources: ["website", "linkedin", "twitter"],
    suggestedSurfaces: ["cold_outbound", "founder_social", "referral_program"],
    skipSurfaces: ["short_form_video"],
    welcomeMessage: "LaunchPilot sees a service-led business. The fastest path is tight positioning plus outbound and referral loops.",
    quickWins: [
      "Review your outbound messaging",
      "Approve a week of credibility-building posts",
      "Activate referral-friendly surfaces",
    ],
    featuresToHighlight: ["content_queue", "email_campaigns", "growth_surfaces"],
    featuresToDefer: ["seo_content", "partner_intelligence"],
  },
  ecommerce: {
    primarySources: ["website", "instagram", "twitter"],
    suggestedSurfaces: ["short_form_video", "lifecycle_email", "founder_social"],
    skipSurfaces: ["cold_outbound"],
    welcomeMessage: "LaunchPilot sees a product-led storefront. Visual demand creation and lifecycle follow-up should move first.",
    quickWins: [
      "Generate product-led social content",
      "Review your first lifecycle email ideas",
      "Turn on the most relevant growth surfaces",
    ],
    featuresToHighlight: ["content_queue", "performance", "growth_surfaces"],
    featuresToDefer: ["cold_outbound"],
  },
  local_business: {
    primarySources: ["website", "instagram", "linkedin"],
    suggestedSurfaces: ["founder_social", "community_engagement", "directory_presence"],
    skipSurfaces: ["cold_outbound"],
    welcomeMessage: "LaunchPilot sees a location-based business. Local proof and community distribution matter more than broad channel volume.",
    quickWins: [
      "Approve local-proof content",
      "Review directory submissions",
      "Install tracking so local demand becomes measurable",
    ],
    featuresToHighlight: ["content_queue", "directory_presence", "performance"],
    featuresToDefer: ["cold_outbound", "partner_intelligence"],
  },
  generic: {
    primarySources: ["website", "twitter", "linkedin"],
    suggestedSurfaces: ["founder_social", "community_engagement", "directory_presence"],
    skipSurfaces: [],
    welcomeMessage: "LaunchPilot has enough signal to start. The first goal is fast execution and learning which growth surfaces respond.",
    quickWins: [
      "Confirm your active surfaces",
      "Approve your first content batch",
      "Connect tracking before traffic starts landing",
    ],
    featuresToHighlight: ["content_queue", "growth_surfaces", "performance"],
    featuresToDefer: [],
  },
};

const PERSONA_CHANNEL_ORDER: Record<OnboardingPersona, ContentChannel[]> = {
  saas_founder: ["blog", "twitter", "directory", "reddit", "email", "tiktok"],
  creator: ["twitter", "tiktok", "reddit", "email", "blog", "directory"],
  service_provider: ["email", "twitter", "blog", "directory", "reddit", "tiktok"],
  ecommerce: ["tiktok", "email", "twitter", "blog", "directory", "reddit"],
  local_business: ["directory", "twitter", "blog", "reddit", "email", "tiktok"],
  generic: ["twitter", "blog", "reddit", "email", "directory", "tiktok"],
};

const PERSONA_NAV_ORDER: Record<OnboardingPersona, string[]> = {
  saas_founder: ["Dashboard", "Marketing Brief", "Growth Surfaces", "30-Day Plan", "Approval Queue", "Performance", "All Content", "Activity"],
  creator: ["Dashboard", "Approval Queue", "All Content", "Performance", "Growth Surfaces", "30-Day Plan", "Marketing Brief", "Activity"],
  service_provider: ["Dashboard", "Approval Queue", "Growth Surfaces", "30-Day Plan", "Performance", "All Content", "Marketing Brief", "Activity"],
  ecommerce: ["Dashboard", "Approval Queue", "Performance", "All Content", "Growth Surfaces", "30-Day Plan", "Marketing Brief", "Activity"],
  local_business: ["Dashboard", "Growth Surfaces", "Approval Queue", "Performance", "30-Day Plan", "All Content", "Marketing Brief", "Activity"],
  generic: ["Dashboard", "Marketing Brief", "30-Day Plan", "Growth Surfaces", "Approval Queue", "All Content", "Performance", "Activity"],
};

function normalizeSourceKeys(sourcesJson?: SourceRecord) {
  return Object.entries(sourcesJson || {})
    .filter(([, value]) => Boolean(value))
    .map(([key]) => key.replace(/_manual$/, ""));
}

function hasSource(sourceKeys: string[], key: string) {
  return sourceKeys.includes(key);
}

function looksLocal(brief?: MarketingBrief | null, profile?: BusinessProfile | null) {
  const haystack = [
    brief?.target_customer,
    brief?.pain_point,
    brief?.positioning,
    profile?.description,
    profile?.target_audience,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return /\blocal\b|\bclinic\b|\bsalon\b|\brestaurant\b|\bshop\b|\bnear me\b|\bappointment\b/.test(haystack);
}

export function detectPersona(input: {
  brief?: MarketingBrief | null;
  businessProfile?: BusinessProfile | null;
  sourcesJson?: SourceRecord;
}): OnboardingPersona {
  const { brief, businessProfile, sourcesJson } = input;
  const sourceKeys = normalizeSourceKeys(sourcesJson);
  const businessType = (businessProfile?.business_type || brief?.business_type || "").toLowerCase();

  if ((businessType === "saas" || businessType === "software") && hasSource(sourceKeys, "website")) {
    return "saas_founder";
  }

  if (!hasSource(sourceKeys, "website") && (hasSource(sourceKeys, "instagram") || hasSource(sourceKeys, "tiktok"))) {
    return "creator";
  }

  if (businessType === "creator") return "creator";
  if (businessType === "service" || businessType === "agency" || businessType === "consulting") {
    return "service_provider";
  }
  if (businessType === "ecommerce" || businessType === "physical-product") {
    return "ecommerce";
  }
  if (businessType === "local" || looksLocal(brief, businessProfile)) {
    return "local_business";
  }

  return "generic";
}

export function getOnboardingConfig(persona: OnboardingPersona): OnboardingConfig {
  return { persona, ...PERSONA_CONFIG[persona] };
}

export function buildInitialOnboardingState(input: {
  brief?: MarketingBrief | null;
  businessProfile?: BusinessProfile | null;
  sourcesJson?: SourceRecord;
  existing?: SiteOnboardingState | null;
}): SiteOnboardingState {
  const persona = detectPersona(input);
  const config = getOnboardingConfig(persona);
  const existingSteps = new Set<OnboardingStepKey>(input.existing?.steps_completed || []);
  existingSteps.add("brief_confirmed");

  return {
    persona,
    wizard_completed: input.existing?.wizard_completed || false,
    checklist_dismissed: input.existing?.checklist_dismissed || false,
    steps_completed: Array.from(existingSteps),
    completed_at: input.existing?.completed_at || null,
    welcome_message: config.welcomeMessage,
  };
}

export function getPersonaChannelOrder(persona?: OnboardingPersona | null) {
  return PERSONA_CHANNEL_ORDER[persona || "generic"];
}

export function sortChannelsForPersona<T extends { channel: ContentChannel }>(
  items: T[],
  persona?: OnboardingPersona | null
) {
  const order = getPersonaChannelOrder(persona);
  return [...items].sort(
    (a, b) => order.indexOf(a.channel) - order.indexOf(b.channel)
  );
}

export function sortLabelsForPersona<T extends { label: string }>(
  items: T[],
  persona?: OnboardingPersona | null
) {
  const order = PERSONA_NAV_ORDER[persona || "generic"];
  const normalizeLabel = (label: string) => {
    if (label === "Brief") return "Marketing Brief";
    if (label === "Plan") return "30-Day Plan";
    if (label === "Surfaces") return "Growth Surfaces";
    if (label === "Queue") return "Approval Queue";
    if (label === "Content") return "All Content";
    return label;
  };
  return [...items].sort((a, b) => {
    const aIndex = order.indexOf(normalizeLabel(a.label));
    const bIndex = order.indexOf(normalizeLabel(b.label));
    const safeA = aIndex === -1 ? order.length : aIndex;
    const safeB = bIndex === -1 ? order.length : bIndex;
    return safeA - safeB;
  });
}

export function getChecklistSteps(onboarding?: SiteOnboardingState | null) {
  return new Set<OnboardingStepKey>(onboarding?.steps_completed || []);
}

export function buildPersonaSummary(site: Pick<Site, "brief_json" | "business_profile_json" | "sources_json" | "onboarding_json">) {
  const persona =
    site.onboarding_json?.persona ||
    detectPersona({
      brief: site.brief_json,
      businessProfile: site.business_profile_json,
      sourcesJson: site.sources_json,
    });
  return {
    persona,
    config: getOnboardingConfig(persona),
  };
}
