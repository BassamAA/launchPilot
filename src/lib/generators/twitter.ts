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
${guidance ? `\nContent intelligence:\n${guidance}\n` : ""}

Mix these formats evenly:
- pain_point: Name the exact frustration your reader feels. Be specific — use numbers, situations, or recognizable moments. Not "it's hard to do X" — more like "you've shipped 3 products and none has 100 users yet."
- product_tip: One concrete thing ${brief.product_name} does, shown through a specific use case. Lead with the outcome.
- social_proof: Real-feeling milestone or outcome. "X users did Y" or "I've been tracking Z and here's what happened." Avoid generic "we're growing" tweets.
- engagement_question: Ask something that makes your exact reader think "yes, I've wondered that too." Not broad polls — specific, niche questions.
- mini_thread: A 3-tweet thread. Tweet 1 is a hook with a bold claim. Tweets 2-3 deliver on it with specifics.

Hard rules:
- Every tweet under 280 characters (threads: each part under 250)
- Write like a real founder, not a brand account — first person, casual, occasional imperfection
- Never start with: "Did you know", "Introducing", "Excited to share", "As a founder", "Hot take:", "Thread:"
- No more than 1 hashtag per tweet — and only if it genuinely fits (most should have zero)
- Maximum 2 tweets should directly mention ${brief.product_name} by name — the rest build audience
- Never use: revolutionize, game-changer, leverage, seamlessly, cutting-edge, empower, unlock, supercharge, transformative
- Vary the opening word of every tweet — no two tweets should start the same way
- Use specific numbers and details from the product brief instead of vague claims

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
