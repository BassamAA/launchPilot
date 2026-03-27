import { callClaude, buildMarketingSystemPrompt } from "@/lib/claude";
import { MarketingBrief } from "@/types";

export type EmailStyle = "short_intro" | "value_focused" | "case_study";

export interface EmailTemplate {
  style: EmailStyle;
  subject_line: string;
  preview_text: string;
  body: string;
  cta: string;
  notes: string;
}

interface EmailBatch {
  templates: EmailTemplate[];
}

export async function generateColdEmailTemplates(
  brief: MarketingBrief,
  guidance?: string
): Promise<EmailTemplate[]> {
  const systemPrompt = buildMarketingSystemPrompt(brief);

  const userPrompt = `Write 3 cold email templates for ${brief.product_name}.

Recipient: ${brief.target_customer}
Their problem: ${brief.pain_point}
What ${brief.product_name} does: ${brief.value_proposition}
${guidance ? `\nContent intelligence:\n${guidance}\n` : ""}

Write 3 styles:

1. short_intro — 4–6 sentences. Identify the exact person, name the problem they probably have, mention ${brief.product_name} in one sentence, ask one low-friction question. Nothing more.

2. value_focused — 8–10 sentences. Open with the outcome they want, then explain how ${brief.product_name} gets them there. One specific result or use case, not a feature list. End with a question or soft ask.

3. case_study — 10–12 sentences. "I had this exact problem, so I built ${brief.product_name}." Tell the mini-story. What didn't work. What changed. What it looks like now. Invite them to see it.

Rules that apply to all 3:
- Subject lines: under 45 characters. Sound like a real person wrote it.
- First word is not "I" — lead with them, not you
- Never: "I hope this email finds you well", "I wanted to reach out", "I'm reaching out because"
- One clear CTA at the end — a question, not a demand ("Would this be worth 15 minutes?" not "Book a call here")
- Mark personalization spots: {{first_name}}, {{company}}, {{specific_role_or_situation}}
- Preview text reveals something the subject line doesn't — they work together
- Under 150 words per email (short_intro under 80)
- No feature lists — one outcome per email
- Never use: revolutionize, game-changer, leverage, seamlessly, cutting-edge, empower, unlock, supercharge

Return JSON:
{
  "templates": [
    {
      "style": "short_intro|value_focused|case_study",
      "subject_line": "Under 45 chars",
      "preview_text": "Reveals something the subject doesn't",
      "body": "Email body with {{placeholders}}",
      "cta": "The specific ask at the end",
      "notes": "Who this works best for and when to use it"
    }
  ]
}`;

  const result = await callClaude<EmailBatch>({
    model: "sonnet",
    systemPrompt,
    userPrompt,
    maxTokens: 2500,
  });

  return result.data.templates || [];
}
