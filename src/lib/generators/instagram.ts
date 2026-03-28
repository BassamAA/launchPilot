import { callClaude } from "@/lib/claude";
import { MarketingBrief, BusinessProfile } from "@/types";

// ─── Output Types ─────────────────────────────────────────────────────

export interface InstagramContentPillar {
  name: string;
  description: string;
  /** % of posts this pillar should represent */
  frequency_pct: number;
  post_ideas: string[];
  example_caption: string;
}

export interface InstagramFormatMix {
  reels_pct: number;
  carousels_pct: number;
  static_posts_pct: number;
  stories_per_week: number;
  reasoning: string;
}

export interface InstagramHashtagCluster {
  cluster_name: string;
  /** Use niche clusters — broad tags (<500k) + micro tags (<50k) get more reach for small accounts */
  tags: string[];
  use_case: string;
}

export interface InstagramCollaborator {
  account_archetype: string;
  /** Why this type of account is a good fit */
  audience_fit: string;
  collaboration_type: "story_swap" | "collab_post" | "joint_reel" | "shoutout" | "live_interview" | "product_feature";
  outreach_dm: string;
  estimated_follower_range: string;
  example_accounts?: string[];
}

export interface InstagramReelConcept {
  hook: string;
  /** First 3 seconds — what happens on screen */
  opening_visual: string;
  structure: string[];
  caption_hook: string;
  suggested_audio_type: "trending_sound" | "original_voiceover" | "voiceover_over_b_roll" | "silent_with_text";
  cta: string;
}

export interface InstagramCarouselConcept {
  title_slide: string;
  slides: string[];
  final_slide_cta: string;
  caption: string;
}

export interface InstagramCalendarItem {
  day: number;
  format: "reel" | "carousel" | "static" | "story";
  pillar: string;
  concept: string;
  caption_draft: string;
  hashtag_cluster: string;
}

export interface InstagramProfileOptimization {
  bio_draft: string;
  username_suggestion: string | null;
  highlight_categories: string[];
  link_in_bio_strategy: string;
  profile_photo_direction: string;
}

export interface InstagramStrategy {
  account_positioning: string;
  unique_angle: string;
  content_pillars: InstagramContentPillar[];
  format_mix: InstagramFormatMix;
  posting_frequency: string;
  best_posting_times: string[];
  hashtag_clusters: InstagramHashtagCluster[];
  collaborators: InstagramCollaborator[];
  reel_concepts: InstagramReelConcept[];
  carousel_concepts: InstagramCarouselConcept[];
  thirty_day_calendar: InstagramCalendarItem[];
  profile_optimization: InstagramProfileOptimization;
  growth_milestones: Array<{ followers: number; unlock: string }>;
  what_not_to_do: string[];
  generated_at: string;
}

// ─── Generator ────────────────────────────────────────────────────────

export async function generateInstagramStrategy(
  brief: MarketingBrief,
  businessProfile: BusinessProfile | null
): Promise<InstagramStrategy> {
  const systemPrompt = `You are an Instagram growth strategist who has helped 100+ founders and indie hackers grow to their first 10k followers and convert them into customers. You understand the Instagram algorithm deeply and know what actually works for small accounts in 2024-2025:

- Reels get 3-5x more reach than static posts for accounts under 10k
- Carousel posts get saved more and drive discovery via the Explore page
- Niche hashtags (10k-300k posts) outperform broad ones (#entrepreneur with 100M posts shows you to nobody relevant)
- The hook in the first 1-3 seconds of a Reel is the only thing that matters for retention
- Story interactions (polls, questions) boost your ranking with the algorithm
- Collaboration posts (collab feature) show to BOTH audiences — the highest ROI growth tactic for small accounts
- DM conversations increase your account's trust score
- Consistency matters more than perfection — 3x/week beats 1x/day for two weeks then nothing

You know the difference between vanity metrics and real business outcomes. Your strategies convert followers into customers, not just grow numbers.

You MUST respond with ONLY valid JSON. No markdown, no text outside the JSON.`;

  const profileContext = businessProfile
    ? `\nBusiness context:
- Description: ${businessProfile.description}
- Target audience: ${businessProfile.target_audience}
- Voice/tone: ${businessProfile.content_voice}
- Pricing: ${businessProfile.pricing || "not specified"}
- Social proof: ${businessProfile.social_proof?.slice(0, 2).join("; ") || "none yet"}`
    : "";

  const userPrompt = `Generate a complete, specific Instagram growth strategy for this product:

Product: ${brief.product_name}
One-liner: ${brief.one_liner}
Target customer: ${brief.target_customer}
Pain point they feel: ${brief.pain_point}
Value proposition: ${brief.value_proposition}
Positioning: ${brief.positioning}
${profileContext}

IMPORTANT CONSTRAINTS:
- This is likely a new or small account (assume < 1,000 followers unless stated otherwise)
- Every recommendation must be specific to THIS product and audience — no generic "post valuable content" advice
- Collaboration accounts must be specifically relevant to the target customer (not just "similar sized accounts")
- Hashtags must be niche and specific — not #startup, #entrepreneur, #business
- Reel hooks must be written out word for word — the actual first sentence to say/show
- The 30-day calendar must have real, specific post concepts — not "post about your product"

Return this EXACT JSON structure:

{
  "account_positioning": "One paragraph: who this account is for, what it stands for, and the single most compelling reason someone in the target audience should follow it",
  "unique_angle": "The specific POV or format that will make this account stand out in its niche (e.g., 'The founder who shows real MRR numbers', 'X-style hot takes in video format', 'Before/after transformations for [specific audience]')",
  "content_pillars": [
    {
      "name": "Pillar name",
      "description": "What this pillar covers and why it resonates with the audience",
      "frequency_pct": 30,
      "post_ideas": ["Specific post idea 1", "Specific post idea 2", "Specific post idea 3"],
      "example_caption": "Full caption example for this pillar type, including line breaks for readability, 3-5 relevant emojis, and a clear CTA"
    }
  ],
  "format_mix": {
    "reels_pct": 50,
    "carousels_pct": 30,
    "static_posts_pct": 20,
    "stories_per_week": 5,
    "reasoning": "Why this mix works for this specific account at this stage"
  },
  "posting_frequency": "X posts per week — specific recommendation with reasoning",
  "best_posting_times": ["Tue/Thu 7-9pm local time — when [target audience] is most active", "Saturday 10am-12pm"],
  "hashtag_clusters": [
    {
      "cluster_name": "Cluster theme",
      "tags": ["#specific1", "#specific2", "#specific3", "#specific4", "#specific5"],
      "use_case": "Which post types to use this cluster on"
    }
  ],
  "collaborators": [
    {
      "account_archetype": "Type of account to collaborate with",
      "audience_fit": "Why their audience is a perfect fit for ${brief.product_name}",
      "collaboration_type": "collab_post",
      "outreach_dm": "The exact DM to send, personalized and not spammy. Should feel like a founder reaching out, not a PR pitch.",
      "estimated_follower_range": "5k-50k",
      "example_accounts": ["@example1", "@example2"]
    }
  ],
  "reel_concepts": [
    {
      "hook": "Exact first words/sentence — written out completely",
      "opening_visual": "What the viewer sees in the first 2 seconds before you speak",
      "structure": ["Step 1: ...", "Step 2: ...", "Step 3: ..."],
      "caption_hook": "First line of the caption (what appears before 'more')",
      "suggested_audio_type": "original_voiceover",
      "cta": "Specific CTA for this reel"
    }
  ],
  "carousel_concepts": [
    {
      "title_slide": "Slide 1 text — bold, curiosity-driven hook",
      "slides": ["Slide 2 content", "Slide 3 content", "Slide 4 content"],
      "final_slide_cta": "Last slide CTA — what to do next",
      "caption": "Full caption with hook, context, and CTA"
    }
  ],
  "thirty_day_calendar": [
    {
      "day": 1,
      "format": "reel",
      "pillar": "Pillar name",
      "concept": "Specific post concept for day 1",
      "caption_draft": "First 2 lines of the caption",
      "hashtag_cluster": "Which cluster to use"
    }
  ],
  "profile_optimization": {
    "bio_draft": "Full Instagram bio (max 150 chars). Should state WHO you help, HOW, and have a clear CTA",
    "username_suggestion": "@suggestion or null if current is fine",
    "highlight_categories": ["What to put in each highlight story category"],
    "link_in_bio_strategy": "What the link should go to and why (product page, lead magnet, email list, etc.)",
    "profile_photo_direction": "Specific guidance on what the profile photo should look like"
  },
  "growth_milestones": [
    { "followers": 500, "unlock": "What becomes possible at 500 followers for this specific product" },
    { "followers": 1000, "unlock": "What to do differently at 1k" },
    { "followers": 5000, "unlock": "What new opportunities open up" },
    { "followers": 10000, "unlock": "The real business leverage point" }
  ],
  "what_not_to_do": [
    "Specific mistake this product/audience combination tends to make on Instagram",
    "Another common pitfall"
  ],
  "generated_at": "${new Date().toISOString()}"
}

Generate exactly 5 content pillars, 5 hashtag clusters with 8 tags each, 5 collaborator types, 5 reel concepts, 3 carousel concepts, and a full 30-day calendar (all 30 days).`;

  const result = await callClaude<InstagramStrategy>({
    model: "sonnet",
    systemPrompt,
    userPrompt,
    maxTokens: 8000,
  });

  return result.data;
}

// ─── YouTube Strategy ──────────────────────────────────────────────────

export interface YouTubeVideoIdea {
  title: string;
  thumbnail_concept: string;
  hook_line: string;
  outline: string[];
  target_keyword: string;
  cta: string;
}

export interface YouTubeStrategy {
  channel_positioning: string;
  content_series: Array<{
    name: string;
    format: string;
    cadence: string;
    episode_ideas: string[];
  }>;
  video_ideas: YouTubeVideoIdea[];
  seo_keywords: string[];
  collaborators: Array<{
    archetype: string;
    audience_fit: string;
    collab_format: string;
    outreach_message: string;
  }>;
  channel_growth_tactics: string[];
  what_not_to_do: string[];
  generated_at: string;
}

export async function generateYouTubeStrategy(
  brief: MarketingBrief,
  businessProfile: BusinessProfile | null
): Promise<YouTubeStrategy> {
  const systemPrompt = `You are a YouTube growth strategist who helps founders and product creators build channels that drive real business outcomes. You understand YouTube SEO, the importance of the first 30 seconds of a video, thumbnail psychology, and how to build a viewer-to-customer pipeline.

Key principles you apply:
- YouTube is a search engine first, social network second — every video needs a keyword target
- The title + thumbnail combo determines 80% of click-through rate
- Retention in the first 30 seconds determines whether YouTube recommends your video
- Long-form (10-20 min) builds trust and converts to customers; shorts drive discovery
- Consistency in one niche beats variety — pick a lane and own it
- Collaborations with other creators multiply reach

You MUST respond with ONLY valid JSON.`;

  const profileContext = businessProfile ? `\nBusiness: ${businessProfile.description}\nAudience: ${businessProfile.target_audience}` : "";

  const userPrompt = `Create a YouTube channel strategy for:

Product: ${brief.product_name}
One-liner: ${brief.one_liner}
Target customer: ${brief.target_customer}
Pain point: ${brief.pain_point}
Value prop: ${brief.value_proposition}
${profileContext}

Return this JSON:
{
  "channel_positioning": "What the channel is, who it's for, and why someone should subscribe in one paragraph",
  "content_series": [
    {
      "name": "Series name",
      "format": "Format description",
      "cadence": "Posting frequency",
      "episode_ideas": ["Specific episode 1", "Specific episode 2", "Specific episode 3"]
    }
  ],
  "video_ideas": [
    {
      "title": "Exact video title optimized for search",
      "thumbnail_concept": "What the thumbnail should show — specific visual direction",
      "hook_line": "The exact first sentence of the video",
      "outline": ["0:00 Hook", "0:30 Problem setup", "2:00 Main content", "8:00 CTA"],
      "target_keyword": "Primary keyword this video targets",
      "cta": "What to ask viewers to do at the end"
    }
  ],
  "seo_keywords": ["keyword 1", "keyword 2"],
  "collaborators": [
    {
      "archetype": "Type of creator to collaborate with",
      "audience_fit": "Why their audience wants ${brief.product_name}",
      "collab_format": "Interview | tutorial collab | shoutout | cross-promotion",
      "outreach_message": "Exact message to send"
    }
  ],
  "channel_growth_tactics": ["Specific tactic 1", "Specific tactic 2"],
  "what_not_to_do": ["Common mistake 1", "Common mistake 2"],
  "generated_at": "${new Date().toISOString()}"
}

Generate 3 content series, 8 video ideas, 10 SEO keywords, 4 collaborator types, 6 growth tactics, and 5 things not to do.`;

  const result = await callClaude<YouTubeStrategy>({
    model: "sonnet",
    systemPrompt,
    userPrompt,
    maxTokens: 6000,
  });

  return result.data;
}

// ─── LinkedIn Strategy ─────────────────────────────────────────────────

export interface LinkedInPostIdea {
  hook: string;
  format: "story" | "list" | "hot_take" | "behind_scenes" | "lesson" | "data";
  body_outline: string;
  cta: string;
}

export interface LinkedInStrategy {
  profile_optimization: {
    headline: string;
    about_section: string;
    featured_section_strategy: string;
  };
  content_pillars: Array<{
    name: string;
    why_it_works: string;
    post_ideas: string[];
  }>;
  post_ideas: LinkedInPostIdea[];
  commenting_strategy: string;
  connection_strategy: string;
  collaborators: Array<{
    archetype: string;
    how_to_engage: string;
    collab_opportunity: string;
  }>;
  what_not_to_do: string[];
  generated_at: string;
}

export async function generateLinkedInStrategy(
  brief: MarketingBrief,
  businessProfile: BusinessProfile | null
): Promise<LinkedInStrategy> {
  const systemPrompt = `You are a LinkedIn growth strategist who helps founders turn their professional network into a customer pipeline. You know that on LinkedIn, authentic founder stories outperform polished corporate content, that thoughtful comments on other people's posts compound into inbound leads, and that the algorithm rewards posts that generate saves and comments — not just likes.

Key principles:
- Personal profiles outperform company pages for early-stage founders 10:1
- The hook is everything — the first line before "see more" determines if anyone reads the rest
- Story-format posts (personal struggle → lesson) generate 3-5x more engagement than tips lists
- Strategic commenting on high-traffic posts in your niche builds a following faster than posting alone
- LinkedIn connections are warmer leads than most other platforms

You MUST respond with ONLY valid JSON.`;

  const profileContext = businessProfile ? `\nBusiness: ${businessProfile.description}\nAudience: ${businessProfile.target_audience}` : "";

  const userPrompt = `Create a LinkedIn strategy for this founder building:

Product: ${brief.product_name}
One-liner: ${brief.one_liner}
Target customer: ${brief.target_customer}
Pain point: ${brief.pain_point}
Value prop: ${brief.value_proposition}
${profileContext}

Return this JSON:
{
  "profile_optimization": {
    "headline": "LinkedIn headline (max 220 chars) — specific, outcome-focused, not job title",
    "about_section": "Full about section draft — starts with a hook, tells the founder story, explains the product, ends with CTA",
    "featured_section_strategy": "What to pin in the featured section and why"
  },
  "content_pillars": [
    {
      "name": "Pillar name",
      "why_it_works": "Why this content resonates with ${brief.target_customer} on LinkedIn",
      "post_ideas": ["Specific post idea 1", "Specific post idea 2", "Specific post idea 3"]
    }
  ],
  "post_ideas": [
    {
      "hook": "Exact first line — what appears before 'see more'",
      "format": "story",
      "body_outline": "What the rest of the post covers",
      "cta": "What to ask readers to do"
    }
  ],
  "commenting_strategy": "Specific strategy for which posts to comment on, what to say, and how often — to build visibility in the target audience",
  "connection_strategy": "Who to connect with (specific job titles, company types, communities) and the message to send with connection requests",
  "collaborators": [
    {
      "archetype": "Type of LinkedIn creator or professional to engage with",
      "how_to_engage": "Specific engagement approach — comment, DM, co-post",
      "collab_opportunity": "What collaboration would look like and why it benefits both"
    }
  ],
  "what_not_to_do": ["LinkedIn-specific mistake 1", "LinkedIn-specific mistake 2"],
  "generated_at": "${new Date().toISOString()}"
}

Generate 4 content pillars with 3 post ideas each, 8 post ideas, 4 collaborator types, and 5 things not to do.`;

  const result = await callClaude<LinkedInStrategy>({
    model: "sonnet",
    systemPrompt,
    userPrompt,
    maxTokens: 5000,
  });

  return result.data;
}

// ─── Twitter Strategy ──────────────────────────────────────────────────

export interface TwitterStrategy {
  account_positioning: string;
  unique_angle: string;
  content_pillars: Array<{
    name: string;
    description: string;
    frequency_pct: number;
    tweet_ideas: string[];
  }>;
  posting_schedule: {
    tweets_per_day: number;
    best_days: string[];
    best_times: Array<{ day: string; times: string[] }>;
    reasoning: string;
  };
  thread_concepts: Array<{
    hook: string;
    outline: string[];
    cta: string;
  }>;
  engagement_tactics: string[];
  accounts_to_engage: Array<{
    archetype: string;
    why: string;
    example_accounts: string[];
    engagement_approach: string;
  }>;
  thirty_day_calendar: Array<{
    day: number;
    type: "tweet" | "thread" | "reply_bait" | "poll";
    pillar: string;
    concept: string;
    draft: string;
    best_time: string;
  }>;
  growth_milestones: Array<{ followers: number; unlock: string }>;
  what_not_to_do: string[];
  generated_at: string;
}

export async function generateTwitterStrategy(
  brief: MarketingBrief,
  businessProfile: BusinessProfile | null
): Promise<TwitterStrategy> {
  const systemPrompt = `You are a Twitter/X growth strategist who has helped 200+ indie hackers and founders build audiences that drive real revenue. You understand what actually moves the needle on Twitter in 2024-2025 for small accounts:

- Consistency beats virality — showing up daily compounds faster than one viral tweet
- Threads are the highest-leverage content format: one good thread can add hundreds of followers overnight
- Reply-bait tweets (questions, polls, hot takes) drive engagement signals that boost algorithmic reach
- Build in public — sharing real numbers (MRR, churn, experiments) gets 5-10x more engagement than generic advice
- The hook is everything — you have 280 characters on the first tweet and the first line is the only thing that determines if someone reads on
- Engaging with accounts larger than you (thoughtful, specific replies) gets you in front of their audience for free
- Niche dominance > broad appeal — being the go-to account for ONE specific pain point beats trying to appeal to everyone
- Twitter growth is a 6-12 month game — set milestones that keep momentum going
- Polls and reply-bait posts are the best way to trigger algorithm distribution for new accounts
- Follow-up DMs after genuine engagement convert to customers at rates other channels cannot match

You understand the difference between follower vanity metrics and building an audience that actually converts to paying customers.

You MUST respond with ONLY valid JSON. No markdown, no text outside the JSON.`;

  const profileContext = businessProfile
    ? `\nBusiness context:
- Description: ${businessProfile.description}
- Target audience: ${businessProfile.target_audience}
- Voice/tone: ${businessProfile.content_voice}
- Pricing: ${businessProfile.pricing || "not specified"}
- Social proof: ${businessProfile.social_proof?.slice(0, 2).join("; ") || "none yet"}`
    : "";

  const userPrompt = `Generate a complete, specific Twitter/X growth strategy for this product:

Product: ${brief.product_name}
One-liner: ${brief.one_liner}
Target customer: ${brief.target_customer}
Pain point they feel: ${brief.pain_point}
Value proposition: ${brief.value_proposition}
Positioning: ${brief.positioning}
${profileContext}

IMPORTANT CONSTRAINTS:
- Assume this is a new or small account (< 500 followers) — tactics must work at zero reach
- Every recommendation must be specific to THIS product and audience — no generic advice
- Draft tweets must be written out in full (under 280 characters each) and ready to post
- Thread hooks must be the actual first tweet, written out completely
- Accounts to engage should be real account archetypes with specific handles in the example_accounts field
- The 30-day calendar must have a specific draft for every single day (all 30 days) — no placeholders
- Posting times must be specific (e.g., "8am EST", "12pm EST", "6pm EST")

Return this EXACT JSON structure:

{
  "account_positioning": "One paragraph: who this account represents, what it stands for, and the single most compelling reason someone in the target audience should follow it",
  "unique_angle": "The specific POV, format, or persona that makes this account stand out — e.g., 'The indie founder who shows real churn numbers', 'Hot takes on [niche] from a practitioner, not a guru'",
  "content_pillars": [
    {
      "name": "Pillar name",
      "description": "What this pillar covers and why it resonates with the audience on Twitter",
      "frequency_pct": 25,
      "tweet_ideas": ["Specific tweet idea 1 — written out", "Specific tweet idea 2 — written out", "Specific tweet idea 3 — written out", "Specific tweet idea 4 — written out"]
    }
  ],
  "posting_schedule": {
    "tweets_per_day": 2,
    "best_days": ["Monday", "Tuesday", "Wednesday", "Thursday"],
    "best_times": [
      { "day": "Monday", "times": ["8am EST", "6pm EST"] },
      { "day": "Tuesday", "times": ["8am EST", "12pm EST", "6pm EST"] }
    ],
    "reasoning": "Why this schedule works for this specific audience — when are they on Twitter, what mode are they in"
  },
  "thread_concepts": [
    {
      "hook": "Exact first tweet of the thread — written out completely, under 280 chars, engineered to stop the scroll",
      "outline": ["Tweet 2: ...", "Tweet 3: ...", "Tweet 4: ...", "Tweet 5: ...", "Final tweet: CTA and summary"],
      "cta": "Specific CTA at the end of the thread — what to ask readers to do"
    }
  ],
  "engagement_tactics": [
    "Specific, actionable tactic for growing through engagement — not 'reply to people', but exactly what to say and to whom"
  ],
  "accounts_to_engage": [
    {
      "archetype": "Type of account to engage with (e.g., 'Bootstrapped SaaS founders with 5k-50k followers')",
      "why": "Why their audience is full of potential customers for ${brief.product_name}",
      "example_accounts": ["@example1", "@example2", "@example3"],
      "engagement_approach": "Exactly how to engage — what type of replies to leave, how to add value, what NOT to do"
    }
  ],
  "thirty_day_calendar": [
    {
      "day": 1,
      "type": "tweet",
      "pillar": "Pillar name",
      "concept": "What this tweet is about",
      "draft": "The actual tweet text, ready to post, under 280 characters",
      "best_time": "8am EST"
    }
  ],
  "growth_milestones": [
    { "followers": 100, "unlock": "What becomes possible at 100 followers for this specific product and strategy" },
    { "followers": 500, "unlock": "What changes at 500 — what new tactics open up" },
    { "followers": 1000, "unlock": "The inflection point — what to do differently now" },
    { "followers": 5000, "unlock": "Real leverage — what business outcomes become achievable" }
  ],
  "what_not_to_do": [
    "Specific Twitter mistake this founder/product type tends to make",
    "Another common pitfall that kills growth or damages reputation"
  ],
  "generated_at": "${new Date().toISOString()}"
}

Generate exactly 5 content pillars with 4 tweet ideas each, 5 thread concepts, 8 engagement tactics, 5 accounts_to_engage archetypes, ALL 30 days of the calendar (every day 1-30), 4 growth milestones, and 6 things not to do. Every draft tweet in the calendar must be unique and fully written out. The best_times array in posting_schedule must include an entry for each day in best_days.`;

  const result = await callClaude<TwitterStrategy>({
    model: "sonnet",
    systemPrompt,
    userPrompt,
    maxTokens: 10000,
  });

  return result.data;
}
