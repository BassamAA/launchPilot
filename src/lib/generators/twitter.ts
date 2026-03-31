import { callClaude, buildMarketingSystemPrompt } from "@/lib/claude";
import { MarketingBrief } from "@/types";

export type TweetType =
  | "pain_point"
  | "product_tip"
  | "social_proof"
  | "engagement_question"
  | "mini_thread";

export interface Tweet {
  body: string;
  type: TweetType;
  char_count: number;
  thread_tweets?: string[];
}

interface TweetBatch {
  tweets: Tweet[];
}

export async function generateTweetBatch(
  brief: MarketingBrief,
  count = 20,
  guidance?: string
): Promise<Tweet[]> {
  const systemPrompt = buildMarketingSystemPrompt(brief);

  const userPrompt = `Write ${count} tweets for ${brief.product_name}.

Target reader: ${brief.target_customer}
Core pain: ${brief.pain_point}
Positioning: ${brief.positioning}
Value prop: ${brief.value_proposition}
${guidance ? `\nContent intelligence:\n${guidance}\n` : ""}

These tweets need to feel like they came from an account people would actually follow on X: sharp, readable, opinionated, concrete, and written by someone in the arena.

Mix these formats evenly:
- pain_point: Name a specific frustration, bottleneck, or embarrassing moment the audience recognizes immediately.
- product_tip: Teach one useful tactic or workflow, with the product appearing only if it naturally strengthens the point.
- social_proof: Use believable evidence, a concrete observation, or a before/after change. Avoid fake hype.
- engagement_question: Ask a narrow, informed question that attracts the right replies from the right people.
- mini_thread: A 3-tweet thread where tweet 1 makes a claim or opens a loop, and tweets 2-3 cash it out with substance.

Hard rules:
- Every tweet under 280 characters (threads: each part under 250)
- Write like a real founder or operator, not a content marketer
- Make the first line carry the weight. The opening phrase should create recognition, tension, curiosity, or stakes
- Prioritize clarity and punch over completeness. One idea per tweet
- Use simple sentence shapes and clean rhythm. X rewards readability at a glance
- Never start with: "Did you know", "Introducing", "Excited to share", "As a founder", "Hot take:", "Thread:"
- No more than 1 hashtag per tweet — and only if it genuinely fits (most should have zero)
- Maximum 2 tweets should directly mention ${brief.product_name} by name — the rest should build audience affinity and trust
- Never use: revolutionize, game-changer, leverage, seamlessly, cutting-edge, empower, unlock, supercharge, transformative
- Vary the opening word of every tweet — no two tweets should start the same way
- Use specific numbers, roles, moments, objections, or details instead of vague claims
- Avoid sounding polished. Slight edge is fine; empty hype is not
- At least 30% of the set should be strong enough to earn replies, not just passive likes
- At least 30% of the set should teach, reframe, or reveal something useful in under 280 characters
- When using line breaks, use them intentionally for pacing, not decoration

What strong X posts do:
- Make one sharp point fast
- Sound like a person who learned something the hard way
- Use contrast, specificity, and tension
- Reward the reader quickly

What weak X posts do:
- Read like mini blog posts
- Say obvious things every founder has already seen
- Mention the product too early
- Try to sound profound without saying anything concrete

Return JSON:
{
  "tweets": [
    {
      "body": "tweet text",
      "type": "pain_point|product_tip|social_proof|engagement_question|mini_thread",
      "char_count": 240,
      "thread_tweets": ["tweet 1", "tweet 2", "tweet 3"]
    }
  ]
}`;

  const result = await callClaude<TweetBatch>({
    model: "sonnet",
    systemPrompt,
    userPrompt,
    maxTokens: 3000,
  });

  return result.data.tweets || [];
}
