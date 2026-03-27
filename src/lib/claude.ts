import Anthropic from "@anthropic-ai/sdk";
import { MarketingBrief } from "@/types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const SONNET = "claude-sonnet-4-20250514";
const HAIKU = "claude-haiku-4-5-20251001";

interface ClaudeCallOptions {
  model?: "sonnet" | "haiku";
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  retries?: number;
}

interface ClaudeResult<T> {
  data: T;
  input_tokens: number;
  output_tokens: number;
  model: string;
}

function extractJsonCandidate(rawText: string) {
  const fencedMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstObject = rawText.indexOf("{");
  const lastObject = rawText.lastIndexOf("}");
  if (firstObject !== -1 && lastObject > firstObject) {
    return rawText.slice(firstObject, lastObject + 1).trim();
  }

  const firstArray = rawText.indexOf("[");
  const lastArray = rawText.lastIndexOf("]");
  if (firstArray !== -1 && lastArray > firstArray) {
    return rawText.slice(firstArray, lastArray + 1).trim();
  }

  return rawText.trim();
}

function sanitizeJsonCandidate(candidate: string) {
  return candidate
    .replace(/^\uFEFF/, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/,\s*([}\]])/g, "$1")
    .trim();
}

function tryParseJson<T>(rawText: string): T {
  const candidate = extractJsonCandidate(rawText);

  try {
    return JSON.parse(candidate) as T;
  } catch {
    const sanitized = sanitizeJsonCandidate(candidate);
    return JSON.parse(sanitized) as T;
  }
}

async function repairJsonWithHaiku<T>(rawText: string): Promise<T> {
  const candidate = extractJsonCandidate(rawText);
  const response = await anthropic.messages.create({
    model: HAIKU,
    max_tokens: 4096,
    system:
      "You repair malformed JSON. Return only valid JSON that preserves the original structure and values as closely as possible.",
    messages: [
      {
        role: "user",
        content: `Repair this malformed JSON and return only valid JSON.

${candidate}`,
      },
    ],
  });

  const repairedText = response.content[0].type === "text" ? response.content[0].text : "";
  return tryParseJson<T>(repairedText);
}

// ─── Core wrapper with retry + JSON parsing ─────────────────────────
export async function callClaude<T = unknown>(
  options: ClaudeCallOptions
): Promise<ClaudeResult<T>> {
  const {
    model = "sonnet",
    systemPrompt,
    userPrompt,
    maxTokens = 4096,
    retries = 2,
  } = options;

  const modelId = model === "sonnet" ? SONNET : HAIKU;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: modelId,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });

      const rawText =
        response.content[0].type === "text" ? response.content[0].text : "";

      let parsed: T;
      try {
        parsed = tryParseJson<T>(rawText);
      } catch {
        parsed = await repairJsonWithHaiku<T>(rawText);
      }

      return {
        data: parsed,
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
        model: modelId,
      };
    } catch (error) {
      lastError = error as Error;
      if (attempt < retries) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (attempt + 1))
        );
      }
    }
  }

  throw new Error(
    `Claude API call failed after ${retries + 1} attempts: ${lastError?.message}`
  );
}

// ─── System prompt builder ──────────────────────────────────────────
export function buildMarketingSystemPrompt(brief: MarketingBrief): string {
  return `You are LaunchPilot, an expert marketing engine. You are generating marketing content for the following product:

Product: ${brief.product_name}
One-liner: ${brief.one_liner}
Target Customer: ${brief.target_customer}
Pain Point: ${brief.pain_point}
Value Proposition: ${brief.value_proposition}
Positioning & Tone: ${brief.positioning}
Keywords: ${brief.keywords.join(", ")}

IMPORTANT: Respond ONLY with valid JSON. No markdown, no explanations, no text outside the JSON.`;
}

// ─── Site Analysis ──────────────────────────────────────────────────
export async function analyzeSiteContent(
  extractedContent: string,
  url: string
): Promise<ClaudeResult<MarketingBrief>> {
  const systemPrompt = `You are an expert product marketing analyst. You analyze websites and extract key marketing intelligence. You MUST respond with valid JSON only — no markdown fences, no explanations.`;

  const userPrompt = `Analyze this website content from ${url} and extract marketing intelligence.

WEBSITE CONTENT:
${extractedContent}

Return a JSON object with this EXACT structure:
{
  "product_name": "The product's name",
  "one_liner": "One sentence describing what it does (under 15 words)",
  "target_customer": "Specific persona who needs this (e.g., 'freelance designers who invoice clients')",
  "pain_point": "The exact frustrating problem this solves",
  "value_proposition": "Why someone should pay for this vs. alternatives or doing nothing",
  "positioning": "How to talk about this product — tone, angle, key phrases to use",
  "keywords": ["15-20 SEO keywords mixing head terms and long-tail phrases"],
  "competitors": ["3-6 likely competitors based on product category"],
  "recommended_channels": [
    {
      "channel": "blog|twitter|reddit|email|tiktok|directory",
      "reasoning": "Why this channel works for this specific product",
      "priority": 1
    }
  ],
  "content_angles": ["10 specific content ideas that would resonate with the target customer"],
  "subreddit_research": [
    {
      "subreddit": "r/example",
      "subreddit_url": "https://reddit.com/r/example",
      "subscriber_count": "Approx subscriber count as a readable string",
      "rules_summary": "A concise summary of the posting rules and culture",
      "best_time_to_post": "Best day/time window to post",
      "example_post_title": "An example of a post that performed well there",
      "example_post_url": "https://reddit.com/..."
    }
  ]
}

Be specific — avoid generic statements. The target_customer should be a real person with a real job, not 'businesses' or 'users'.`;

  return callClaude<MarketingBrief>({
    model: "sonnet",
    systemPrompt,
    userPrompt,
    maxTokens: 2048,
  });
}

// ─── Token usage tracker ─────────────────────────────────────────────
export interface TokenUsage {
  site_id: string;
  operation: string;
  input_tokens: number;
  output_tokens: number;
  model: string;
  cost_usd: number;
}

export function calculateCost(
  model: string,
  input_tokens: number,
  output_tokens: number
): number {
  // Pricing per million tokens (March 2026 approximate)
  const pricing: Record<string, { input: number; output: number }> = {
    [SONNET]: { input: 3.0, output: 15.0 },
    [HAIKU]: { input: 0.25, output: 1.25 },
  };

  const rates = pricing[model] || pricing[SONNET];
  return (
    (input_tokens / 1_000_000) * rates.input +
    (output_tokens / 1_000_000) * rates.output
  );
}
