import { callClaude, buildMarketingSystemPrompt } from "@/lib/claude";
import {
  MarketingBrief,
  ContentChannel,
  ContentType,
  PlanStrategy,
  PlanChannelThesis,
  PlanGrowthLoop,
} from "@/types";
import { addDays, format } from "date-fns";

export interface PlanActionItem {
  week: number;
  day: number;
  action_type: ContentType;
  channel: ContentChannel;
  title: string;
  description: string;
  auto_executable: boolean;
  scheduled_date: string;
}

interface RawPlan {
  overview: string;
  growth_thesis?: string;
  north_star_goal?: string;
  acquisition_wedge?: string;
  strategic_bets?: string[];
  risks?: string[];
  growth_loops?: Array<{
    name: string;
    mechanism: string;
    why_it_compounds: string;
  }>;
  channel_theses?: Array<{
    channel: ContentChannel;
    rationale: string;
    success_signal: string;
  }>;
  weeks: Array<{
    week: number;
    theme: string;
    focus: string;
  }>;
  action_items: PlanActionItem[];
}

const WEEK_THEMES: PlanStrategy["weeks"] = [
  { week: 1, theme: "Foundation", focus: "Set up core channels, establish positioning, and publish the first anchor pieces." },
  { week: 2, theme: "Content Push", focus: "Increase volume with educational posts, social promotion, and direct outreach." },
  { week: 3, theme: "Amplification", focus: "Lean into the strongest channels and expand reach with follow-up angles." },
  { week: 4, theme: "Optimization", focus: "Repurpose winners, refresh messaging, and close the month with clear calls to action." },
];

const DEFAULT_CHANNELS: ContentChannel[] = ["blog", "twitter", "reddit", "email", "directory"];

function uniqueChannels(channels: ContentChannel[]) {
  return Array.from(new Set(channels.filter(Boolean)));
}

function buildNorthStarGoal(brief: MarketingBrief) {
  return `Turn ${brief.product_name} from an unknown product into a habit-forming solution for ${brief.target_customer} by creating repeatable acquisition and activation loops.`;
}

function buildAcquisitionWedge(brief: MarketingBrief, channels: ContentChannel[]) {
  const [primary, secondary = "blog"] = channels;
  return `Win initial attention through ${primary} and convert that demand with ${secondary}, using ${brief.value_proposition.toLowerCase()}.`;
}

function buildChannelTheses(brief: MarketingBrief, channels: ContentChannel[]): PlanChannelThesis[] {
  return channels.slice(0, 4).map((channel) => {
    switch (channel) {
      case "blog":
        return {
          channel,
          rationale: `Own high-intent search moments where ${brief.target_customer} are actively looking for a solution.`,
          success_signal: "Organic clicks and signups from problem-aware search queries keep increasing week over week.",
        };
      case "twitter":
        return {
          channel,
          rationale: `Use founder-led distribution to turn strong opinions and product insights into repeat exposure.`,
          success_signal: "High-performing tweets turn into profile visits, replies, and site clicks from the right audience.",
        };
      case "reddit":
        return {
          channel,
          rationale: `Show up inside existing demand pockets where the pain point is already being discussed in public.`,
          success_signal: "Helpful comments consistently drive qualified referral traffic and direct mentions.",
        };
      case "email":
        return {
          channel,
          rationale: "Convert identified prospects with tailored outreach once the positioning is proven.",
          success_signal: "Reply rates and booked conversations improve as messaging gets tighter.",
        };
      case "tiktok":
        return {
          channel,
          rationale: "Package pain-point education into short-form hooks that can reach outside your current audience.",
          success_signal: "Video hooks generate saves, shares, and repeated profile traffic.",
        };
      case "directory":
        return {
          channel,
          rationale: "Capture intent from users browsing tools and alternatives near a purchase decision.",
          success_signal: "Referral traffic from listings keeps compounding as more directories go live.",
        };
      default:
        return {
          channel,
          rationale: `Use ${channel} to create repeatable distribution around ${brief.product_name}.`,
          success_signal: `This channel starts producing qualified traffic and signups.`,
        };
    }
  });
}

function buildGrowthLoops(brief: MarketingBrief, channels: ContentChannel[]): PlanGrowthLoop[] {
  const primary = channels[0] || "blog";
  const secondary = channels[1] || "twitter";

  return [
    {
      name: "Problem discovery loop",
      mechanism: `Publish insight-driven content on ${primary}, learn which pain points pull the most response, and feed those insights back into sharper messaging and new content.`,
      why_it_compounds: "Each winning angle produces better language, stronger hooks, and a larger archive of discoverable assets.",
    },
    {
      name: "Distribution to conversion loop",
      mechanism: `Use ${secondary} and supporting channels to distribute the best-performing ideas, then send that attention to pages built around ${brief.value_proposition.toLowerCase()}.`,
      why_it_compounds: "Top-performing narratives get reused across channels, making each new asset easier to produce and more likely to convert.",
    },
    {
      name: "Social proof loop",
      mechanism: `Turn objections, success moments, and user language from early traction into new trust-building content for ${brief.target_customer}.`,
      why_it_compounds: "Real customer language raises conversion rates and gives the next wave of users more reasons to try the product.",
    },
  ];
}

function contentTypeForChannel(channel: ContentChannel, day: number): ContentType {
  switch (channel) {
    case "blog":
      return "blog_post";
    case "twitter":
      return day % 5 === 0 ? "thread" : "tweet";
    case "reddit":
      return day % 3 === 0 ? "reddit_post" : "reddit_comment";
    case "email":
      return "email_template";
    case "tiktok":
      return "tiktok_script";
    case "directory":
      return "directory_submission";
    default:
      return "blog_post";
  }
}

function fallbackDescription(channel: ContentChannel, angle: string, brief: MarketingBrief, week: number) {
  switch (channel) {
    case "blog":
      return `Publish an SEO blog post built around "${angle}" for ${brief.target_customer}.`;
    case "twitter":
      return `Share a concise Twitter post on "${angle}" and tie it back to ${brief.product_name}.`;
    case "reddit":
      return `Draft a Reddit contribution around "${angle}" that sounds genuinely helpful to ${brief.target_customer}.`;
    case "email":
      return `Create an outreach email based on "${angle}" with a low-friction CTA.`;
    case "tiktok":
      return `Create a short-form script using "${angle}" as the hook and outcome.`;
    case "directory":
      return `Prepare directory submission copy that emphasizes "${angle}" and the value proposition.`;
    default:
      return `Create a marketing asset based on "${angle}" for week ${week}.`;
  }
}

function buildFallbackPlan(
  brief: MarketingBrief,
  startDate: Date,
  preferredChannels?: ContentChannel[]
): { strategy: PlanStrategy; items: PlanActionItem[] } {
  const channels = preferredChannels?.length
    ? preferredChannels
    : brief.recommended_channels?.length
    ? brief.recommended_channels
        .sort((a, b) => a.priority - b.priority)
        .slice(0, 5)
        .map((channel) => channel.channel)
    : DEFAULT_CHANNELS;

  const angles = brief.content_angles.length > 0
    ? brief.content_angles
    : [brief.one_liner, brief.pain_point, brief.value_proposition];
  const keywords = brief.keywords.length > 0 ? brief.keywords : [brief.product_name, brief.target_customer];

  const items: PlanActionItem[] = Array.from({ length: 30 }, (_, index) => {
    const day = index + 1;
    const week = Math.min(4, Math.floor(index / 7) + 1);
    const channel = channels[index % channels.length];
    const angle = angles[index % angles.length];
    const keyword = keywords[index % keywords.length];
    const actionType = contentTypeForChannel(channel, day);

    let title = "";
    switch (channel) {
      case "blog":
        title = `${brief.product_name}: ${keyword} guide`;
        break;
      case "twitter":
        title = `${brief.product_name} founder post: ${angle}`;
        break;
      case "reddit":
        title = `Helpful Reddit draft about ${angle}`;
        break;
      case "email":
        title = `Cold email: ${angle}`;
        break;
      case "tiktok":
        title = `Short-form video script: ${angle}`;
        break;
      case "directory":
        title = `Directory submission: ${brief.product_name}`;
        break;
    }

    return {
      week,
      day,
      channel,
      action_type: actionType,
      title,
      description: fallbackDescription(channel, angle, brief, week),
      auto_executable: channel === "twitter" || channel === "blog",
      scheduled_date: format(addDays(startDate, index), "yyyy-MM-dd"),
    };
  });

  return {
    strategy: {
      overview: `Fallback 30-day execution plan for ${brief.product_name}, focused on ${channels.join(", ")}. This keeps LaunchPilot moving while preserving the same execution workflow even if the AI strategy response was incomplete.`,
      growth_thesis: `${brief.product_name} should win by showing up where ${brief.target_customer} already feel the pain, then converting that attention with sharp positioning and fast proof of value.`,
      north_star_goal: buildNorthStarGoal(brief),
      acquisition_wedge: buildAcquisitionWedge(brief, channels),
      strategic_bets: [
        `Lead with ${channels[0] || "blog"} because it best matches the brief's strongest demand signal.`,
        "Turn every strong content angle into reusable distribution across multiple channels.",
        "Instrument approvals and publishing to learn which narratives convert, not just which ones get produced.",
      ],
      risks: [
        "Spreading effort across too many channels before one narrative starts compounding.",
        "Generic messaging that describes the category but does not sharpen the product's specific wedge.",
        "Publishing volume outrunning the proof that content is turning into activation or signups.",
      ],
      growth_loops: buildGrowthLoops(brief, channels),
      channel_theses: buildChannelTheses(brief, channels),
      weeks: WEEK_THEMES,
    },
    items,
  };
}

function normalizePlan(
  raw: RawPlan | null | undefined,
  brief: MarketingBrief,
  startDate: Date,
  allowedChannels?: ContentChannel[]
): { strategy: PlanStrategy; items: PlanActionItem[] } | null {
  if (!raw || !Array.isArray(raw.action_items) || raw.action_items.length === 0) {
    return null;
  }

  const items: PlanActionItem[] = raw.action_items
    .filter((item) => item && item.channel && item.action_type && item.title)
    .filter((item) => !allowedChannels?.length || allowedChannels.includes(item.channel))
    .map((item, index) => ({
      ...item,
      week: item.week || Math.min(4, Math.floor(index / 7) + 1),
      day: item.day || index + 1,
      description: item.description || `Create content for ${brief.product_name}`,
      auto_executable: typeof item.auto_executable === "boolean" ? item.auto_executable : false,
      scheduled_date: format(addDays(startDate, Math.max(0, (item.day || index + 1) - 1)), "yyyy-MM-dd"),
    }));

  if (items.length === 0) return null;

  return {
    strategy: {
      overview: raw.overview || `30-day execution plan for ${brief.product_name}`,
      growth_thesis:
        raw.growth_thesis ||
        `${brief.product_name} should compound growth by matching its strongest pain points to repeatable distribution and conversion paths.`,
      north_star_goal: raw.north_star_goal || buildNorthStarGoal(brief),
      acquisition_wedge:
        raw.acquisition_wedge || buildAcquisitionWedge(brief, uniqueChannels(items.map((item) => item.channel))),
      strategic_bets:
        raw.strategic_bets?.filter(Boolean).slice(0, 4) || [
          "Find the narrowest high-intent wedge before broadening channel coverage.",
          "Repurpose winners instead of treating each content asset as a one-off.",
          "Bias toward channels that can create durable discovery and repeatable proof.",
        ],
      risks:
        raw.risks?.filter(Boolean).slice(0, 4) || [
          "Volume without a sharp wedge can create activity without traction.",
          "Weak activation pages can waste otherwise strong distribution.",
        ],
      growth_loops:
        raw.growth_loops?.filter((loop) => loop?.name && loop?.mechanism).slice(0, 3) ||
        buildGrowthLoops(brief, uniqueChannels(items.map((item) => item.channel))),
      channel_theses:
        raw.channel_theses?.filter((thesis) => thesis?.channel && thesis?.rationale).slice(0, 4) ||
        buildChannelTheses(brief, uniqueChannels(items.map((item) => item.channel))),
      weeks: raw.weeks?.length ? raw.weeks : WEEK_THEMES,
    },
    items,
  };
}

export async function generateMarketingPlan(
  brief: MarketingBrief,
  startDate: Date = new Date(),
  options?: {
    performanceSummary?: string;
    preferredChannels?: ContentChannel[];
    surfaceSummary?: string;
  }
): Promise<{ strategy: PlanStrategy; items: PlanActionItem[] }> {
  const systemPrompt = buildMarketingSystemPrompt(brief);

  // Determine which channels to use based on recommendations
  const topChannels = options?.preferredChannels?.length
    ? options.preferredChannels
    : brief.recommended_channels
        .sort((a, b) => a.priority - b.priority)
        .slice(0, 5)
        .map((c) => c.channel);

  const userPrompt = `Generate a growth strategy and first 30-day execution plan for ${brief.product_name}.

Priority channels for this product: ${topChannels.join(", ")}
Target customer: ${brief.target_customer}
Content angles to use: ${brief.content_angles.slice(0, 5).join("; ")}
${options?.surfaceSummary ? `\n${options.surfaceSummary}\n` : ""}
${options?.performanceSummary ? `\n${options.performanceSummary}\n` : ""}

First, think like a growth engine, not a generic content marketer.

Create:
- a clear growth thesis for how this product can break out from unknown to widely adopted
- an acquisition wedge: the sharpest angle/channel combination to win first
- 2-4 strategic bets that could compound
- 2-4 risks or constraints that could block growth
- 2-3 growth loops that explain how execution can compound over time
- channel theses for the top 3-4 channels
- then a realistic first 30-day execution plan with:
- Week 1 (days 1–7): Foundation — set up directory submissions, write first blog posts, establish social presence
- Week 2 (days 8–14): Content push — daily social posts, Reddit engagement, outreach drafts
- Week 3 (days 15–21): Amplification — double down on working channels, more outreach, guest post pitches
- Week 4 (days 22–30): Optimization — analyze and scale what's working

Total action items: 30–36 spread across 30 days. Favor quality and channel fit over inflated volume.

Use the performance data above to:
- double down on channels showing real traction
- reduce effort on channels with weak signals
- adjust content types toward formats that actually performed
- lean into hooks, tones, CTAs, and content patterns that are already converting
- update confidence in strategic bets based on observed outcomes
- propose sharper experiments where data is incomplete

For each action item:
- action_type: blog_post|tweet|thread|reddit_comment|reddit_post|email_template|tiktok_script|directory_submission
- channel: blog|twitter|reddit|email|tiktok|directory
- title: Specific title/topic (not generic like "Write a tweet")
- description: What exactly needs to be created or done
- auto_executable: true ONLY for directory submissions and social posts that don't need human review

Return JSON:
{
  "overview": "2-3 sentence strategy overview",
  "growth_thesis": "How this product can compound distribution and user growth",
  "north_star_goal": "The real growth outcome LaunchPilot should push toward",
  "acquisition_wedge": "The sharpest initial path to traction",
  "strategic_bets": ["3-4 bets to make"],
  "risks": ["2-4 things that could block traction"],
  "growth_loops": [
    {
      "name": "Loop name",
      "mechanism": "How the loop works",
      "why_it_compounds": "Why it gets stronger over time"
    }
  ],
  "channel_theses": [
    {
      "channel": "blog|twitter|reddit|email|tiktok|directory",
      "rationale": "Why this channel matters for this product now",
      "success_signal": "What would prove this channel is working"
    }
  ],
  "weeks": [
    { "week": 1, "theme": "Foundation", "focus": "What week 1 focuses on" },
    { "week": 2, "theme": "Content Push", "focus": "What week 2 focuses on" },
    { "week": 3, "theme": "Amplification", "focus": "What week 3 focuses on" },
    { "week": 4, "theme": "Optimization", "focus": "What week 4 focuses on" }
  ],
  "action_items": [
    {
      "week": 1,
      "day": 1,
      "action_type": "blog_post",
      "channel": "blog",
      "title": "Specific blog post title",
      "description": "What this post covers and why",
      "auto_executable": false
    }
  ]
}

Do not wrap the JSON in markdown fences.`;

  try {
    const result = await callClaude<RawPlan>({
      model: "sonnet",
      systemPrompt,
      userPrompt,
      maxTokens: 4096,
      retries: 0,
    });

    const normalized = normalizePlan(result.data, brief, startDate, options?.preferredChannels);
    if (normalized) {
      return normalized;
    }

    console.warn("[generateMarketingPlan] AI returned an empty or incomplete plan. Using fallback.");
  } catch (error) {
    console.warn("[generateMarketingPlan] AI plan generation failed. Using fallback.", error);
  }

  return buildFallbackPlan(brief, startDate, options?.preferredChannels);
}
