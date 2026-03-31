import { callClaude, buildMarketingSystemPrompt } from "@/lib/claude";
import { MarketingBrief } from "@/types";

export type LinkedInPostType =
  | "founder_story"
  | "customer_problem"
  | "lesson_learned"
  | "contrarian_take"
  | "proof_point";

export interface LinkedInPost {
  body: string;
  type: LinkedInPostType;
  char_count: number;
  hook: string;
  cta: string;
}

interface LinkedInBatch {
  posts: LinkedInPost[];
}

export async function generateLinkedInPostBatch(
  brief: MarketingBrief,
  count = 8,
  guidance?: string
): Promise<LinkedInPost[]> {
  const systemPrompt = buildMarketingSystemPrompt(brief);

  const userPrompt = `Write ${count} LinkedIn posts for ${brief.product_name}.

Audience: ${brief.target_customer}
Problem they are dealing with: ${brief.pain_point}
What the product changes: ${brief.value_proposition}
Positioning: ${brief.positioning}
${guidance ? `\nContent intelligence:\n${guidance}\n` : ""}

These posts must feel native to LinkedIn and credible coming from a founder or operator, not a brand ghostwriter.

Mix these post types evenly:
- founder_story: A real founder moment, mistake, tradeoff, or lesson. Use a specific scene, decision, or tension.
- customer_problem: Name a painful pattern the audience keeps running into, then reframe it in a sharper way.
- lesson_learned: A practical takeaway from building, selling, onboarding, or trying to solve the problem.
- contrarian_take: Push against lazy conventional wisdom in the niche, but make the reasoning concrete and defensible.
- proof_point: Use a believable data point, observation, or before/after change to make the post feel grounded.

LinkedIn writing rules:
- Hook quality matters most. The first line must create tension, curiosity, or recognition before "see more"
- Write with short paragraphs and intentional line breaks. Dense walls of text are unacceptable
- Sound like an experienced operator sharing something earned, not a marketer manufacturing wisdom
- Use first person when appropriate, but do not make every post about yourself
- Teach, challenge, or reveal. Do not just "announce"
- Mention ${brief.product_name} directly in no more than 35% of posts
- When the product is mentioned, make it feel like the natural conclusion to the story or insight
- End with a low-friction CTA that invites a comment, DM, or reflection. Avoid hard-selling

Hard bans:
- Do not open with "Excited to share", "Thrilled to announce", "In today's fast-paced world", "As a founder", or "Hot take"
- Do not use emojis as filler
- Do not use hashtags
- Do not use corporate filler words like revolutionize, leverage, seamless, cutting-edge, empower, unlock, optimize, innovative
- Do not write generic advice that could fit any startup
- Do not use fake vulnerability or made-up numbers

Craft rules:
- Every post should be 550-1,500 characters
- Vary the opening pattern across the set
- At least half the posts should include a specific detail: number, role, situation, failed attempt, objection, or moment
- At least 3 posts should be save-worthy educational posts, not just engagement bait
- At least 2 posts should feel comment-worthy because they present a sharp opinion or hard truth
- Keep each CTA to 1 sentence

Return JSON:
{
  "posts": [
    {
      "body": "Full LinkedIn post with line breaks",
      "type": "founder_story|customer_problem|lesson_learned|contrarian_take|proof_point",
      "char_count": 900,
      "hook": "First line only",
      "cta": "Final CTA sentence"
    }
  ]
}`;

  const result = await callClaude<LinkedInBatch>({
    model: "sonnet",
    systemPrompt,
    userPrompt,
    maxTokens: 4000,
  });

  return result.data.posts || [];
}
