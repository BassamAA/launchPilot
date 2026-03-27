import { callClaude, buildMarketingSystemPrompt } from "@/lib/claude";
import { MarketingBrief } from "@/types";

export interface BlogPost {
  title: string;
  meta_description: string;
  slug: string;
  body: string;
  target_keyword: string;
  word_count: number;
}

export async function generateBlogPost(
  brief: MarketingBrief,
  keyword: string,
  angle?: string,
  guidance?: string
): Promise<BlogPost> {
  const systemPrompt = buildMarketingSystemPrompt(brief);

  const userPrompt = `Write a blog post targeting the keyword: "${keyword}".

${angle ? `Angle: ${angle}` : ""}
${guidance ? `\nContent intelligence:\n${guidance}\n` : ""}

Target reader: ${brief.target_customer}
Their pain: ${brief.pain_point}
Product: ${brief.product_name} — ${brief.value_proposition}

Length: 900–1100 words

Title rules:
- Make the reader stop scrolling. Use a number, a counterintuitive claim, or a specific situation.
- Include the keyword naturally
- No clickbait — the title must fully deliver on what the post promises
- Bad: "Why ${brief.product_name} Will Change Your Business" — Good: "I Spent 6 Months Trying to Market My Side Project. Here's What Actually Worked."

Opening (first 3 sentences):
- Start with a specific scene, moment, or number — not "In today's world" or "Many founders struggle with..."
- Make the reader feel immediately understood
- Hook should create a question in their mind they want answered

Body structure (3–4 H2 sections):
- Each H2 makes a specific, useful claim — not "The Importance of X"
- Back every point with a specific example, number, or scenario
- Write for a human reading on their phone — short paragraphs, plain language
- One actionable takeaway per section

Product mention (2–3 times max):
- Introduce ${brief.product_name} as "what I built to solve this" or "what actually solved it for me"
- Never force it — only mention it when it's the most natural fit
- Don't list features — show one specific thing it does and why it matters

Ending:
- Summarize the main insight in 1–2 sentences
- CTA to try ${brief.product_name} that feels like a natural next step, not an ad

Never use: revolutionize, game-changer, leverage, seamlessly, cutting-edge, empower, unlock, supercharge, transformative, powerful, robust, innovative, comprehensive, streamline

Return JSON:
{
  "title": "Blog post title",
  "meta_description": "155-char SEO meta description (read naturally, not stuffed with keywords)",
  "slug": "url-friendly-slug",
  "body": "Full markdown body (## for H2, ### for H3, short paragraphs)",
  "target_keyword": "${keyword}",
  "word_count": 950
}`;

  const result = await callClaude<BlogPost>({
    model: "sonnet",
    systemPrompt,
    userPrompt,
    maxTokens: 4096,
  });

  return result.data;
}

export async function generateBlogPostBatch(
  brief: MarketingBrief,
  count = 4
): Promise<BlogPost[]> {
  const keywords = brief.keywords.slice(0, count);
  const angles = brief.content_angles.slice(0, count);

  const posts = await Promise.all(
    keywords.map((kw, i) => generateBlogPost(brief, kw, angles[i]))
  );

  return posts;
}
