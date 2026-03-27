import { callClaude, buildMarketingSystemPrompt } from "@/lib/claude";
import { MarketingBrief } from "@/types";

export interface TikTokScript {
  title: string;
  duration_seconds: number;
  hook: string;
  problem: string;
  solution: string;
  cta: string;
  full_script: string;
  overlays: string[];
  notes: string;
}

interface TikTokBatch {
  scripts: TikTokScript[];
}

export async function generateTikTokScripts(
  brief: MarketingBrief,
  count = 4,
  guidance?: string
): Promise<TikTokScript[]> {
  const systemPrompt = buildMarketingSystemPrompt(brief);

  const userPrompt = `Write ${count} TikTok/Reels video scripts for ${brief.product_name}.

Viewer: ${brief.target_customer}
Their pain: ${brief.pain_point}
${guidance ? `\nContent intelligence:\n${guidance}\n` : ""}

Structure for each script:
- Hook (0–3 sec): The only job is to stop the scroll. Test different formats across the ${count} scripts:
  * A surprising number or stat: "I made $0 from my first 3 products."
  * A relatable situation: "You've shipped it. You've told your friends. 4 users."
  * A direct address: "If you have a live product and no users, stay."
  * A counterintuitive claim: "The reason your product isn't growing isn't what you think."
  * A before/after reveal: "Six months ago, 12 users. Today, 400."

- Problem (3–15 sec): Make them feel seen. Get specific about the exact situation they're in — the late nights, the posts that got no engagement, the feeling of building in a vacuum. No solutions yet.

- Solution (15–45 sec): Show how ${brief.product_name} actually fixes it. Walk through what happens. Be concrete — don't say "it analyzes your site," say "you paste your URL and 30 seconds later you have a marketing brief that knows your product better than your pitch deck."

- CTA (last 3–5 sec): Simple. "Link in bio." "Try it free." Don't oversell.

Hard rules:
- 30–60 seconds total (120–200 spoken words at natural talking pace)
- Write how people ACTUALLY talk, not how they write — contractions, incomplete thoughts, filler moments
- No "Hey guys!" opener — ever
- Don't use "game-changer", "revolutionize", "seamlessly", or corporate vocabulary
- The hook should work even if someone never watches past 3 seconds
- Suggest 2–3 on-screen text overlays (the big bold text that appears during the video)
- Make each script feel like a different creator made it

Return JSON:
{
  "scripts": [
    {
      "title": "Short descriptive title for internal reference",
      "duration_seconds": 45,
      "hook": "The exact opening line (first 3 seconds)",
      "problem": "Problem section script text",
      "solution": "Solution section script text",
      "cta": "Call to action line",
      "full_script": "Complete script, naturally spoken",
      "overlays": ["Bold text overlay 1", "Bold text overlay 2", "Bold text overlay 3"],
      "notes": "Suggested visuals, screen recordings, or gestures"
    }
  ]
}`;

  const result = await callClaude<TikTokBatch>({
    model: "sonnet",
    systemPrompt,
    userPrompt,
    maxTokens: 3000,
  });

  return result.data.scripts || [];
}
