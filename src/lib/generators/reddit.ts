import { callClaude, buildMarketingSystemPrompt } from "@/lib/claude";
import { MarketingBrief } from "@/types";

export interface RedditDraft {
  subreddit: string;
  subreddit_url: string;
  post_kind: "comment" | "post";
  target_thread_title: string;
  target_thread_url?: string;
  comment_type: "answer" | "share" | "advice";
  prompt_context: string;
  body: string;
  authenticity_note: string;
}

interface RedditBatch {
  subreddits: string[];
  drafts: RedditDraft[];
}

export async function generateRedditDrafts(
  brief: MarketingBrief,
  guidance?: string
): Promise<RedditBatch> {
  const systemPrompt = buildMarketingSystemPrompt(brief);

  const userPrompt = `Find the best subreddits for ${brief.target_customer} and write authentic Reddit comments.

Product: ${brief.product_name}
Builder: The person posting this built ${brief.product_name} because they personally had this problem: ${brief.pain_point}
${guidance ? `\nContent intelligence:\n${guidance}\n` : ""}

Step 1: Identify 6–8 real subreddits where this exact audience already hangs out and asks questions related to this problem.

Step 2: For each, write a comment draft. The comment should:
- Answer the question or add genuine value FIRST — the product mention (if any) comes at the end
- Sound like a real person who's been in the community for a while
- Use the community's vocabulary and norms — no buzzwords, no corporate speak
- Only mention ${brief.product_name} in 40-50% of drafts max, and always as "I built this because I had the same problem" — never as a promotion
- Be 150–350 words — long enough to be useful, short enough to read
- NOT start with "Great question!" or "I completely understand your frustration"

What makes a comment feel fake:
- Immediately mentions a product
- Uses marketing language ("solution", "platform", "seamlessly")
- Solves too perfectly without acknowledging tradeoffs
- Doesn't address the specific situation in the thread

What makes it feel real:
- Acknowledges a specific part of the post
- Shares a personal experience first
- Mentions what didn't work before mentioning what did
- Ends with a question back to the community occasionally

These drafts are always human-reviewed before posting.

Return JSON:
{
  "subreddits": ["r/subreddit1", "r/subreddit2"],
  "drafts": [
    {
      "subreddit": "r/subreddit",
      "subreddit_url": "https://reddit.com/r/subreddit",
      "post_kind": "comment|post",
      "target_thread_title": "Title of the thread to reply to, or new post angle",
      "target_thread_url": "https://reddit.com/...",
      "comment_type": "answer|share|advice",
      "prompt_context": "Type of post this is responding to and why this comment fits",
      "body": "Full comment text",
      "authenticity_note": "Why this reads like a community member, not a marketer"
    }
  ]
}`;

  const result = await callClaude<RedditBatch>({
    model: "sonnet",
    systemPrompt,
    userPrompt,
    maxTokens: 3000,
  });

  return result.data;
}
