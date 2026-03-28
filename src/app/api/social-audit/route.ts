import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { callClaude } from "@/lib/claude";
import { logRouteError } from "@/lib/observability";
import { getUser } from "@/lib/supabase";

export const maxDuration = 60;

const platformSchema = z.object({
  platform: z.enum(["twitter", "instagram", "linkedin", "tiktok"]),
  handle: z.string().min(1),
});

const requestSchema = z.object({
  business_name: z.string().min(1),
  description: z.string().min(1),
  target_audience: z.string().optional(),
  website: z.string().optional(),
  platforms: z.array(platformSchema).min(1),
});

interface AuditResult {
  platform: string;
  handle: string;
  bio_recommendation: string;
  what_to_change: string[];
  why: string;
}

interface AuditResponse {
  audits: AuditResult[];
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const { business_name, description, target_audience, website, platforms } = parsed.data;

    const platformGuidelines = platforms.map((p) => {
      switch (p.platform) {
        case "twitter":
          return `- Twitter/X (@${p.handle.replace(/^@/, "")}): Bio max 160 characters. Give the exact bio text to use, plus 3-5 specific things to change, plus a one-sentence rationale.`;
        case "instagram":
          return `- Instagram (@${p.handle.replace(/^@/, "")}): Bio max 150 characters. Give the exact bio text to use, plus 3-5 specific things to change, plus a one-sentence rationale.`;
        case "linkedin":
          return `- LinkedIn (${p.handle}): Headline max 120 characters + About summary max 300 characters. Combine headline and about into a single bio_recommendation field (label each section clearly). Plus 3-5 specific things to change, plus a one-sentence rationale.`;
        case "tiktok":
          return `- TikTok (@${p.handle.replace(/^@/, "")}): Bio max 80 characters. Give the exact bio text to use, plus 3-5 specific things to change, plus a one-sentence rationale.`;
      }
    }).join("\n");

    const systemPrompt = `You are an elite social media profile consultant who helps founders and indie hackers craft compelling bios and profiles that attract their ideal customers. You have deep expertise in platform-specific best practices, conversion copywriting, and audience psychology. You always respond with valid JSON only — no markdown fences, no explanations outside the JSON.`;

    const userPrompt = `Audit and improve the social media profiles for this business:

Business name: ${business_name}
What they do: ${description}${target_audience ? `\nTarget audience: ${target_audience}` : ""}${website ? `\nWebsite: ${website}` : ""}

For each platform below, provide:
1. An exact, ready-to-copy bio/description text (respecting character limits)
2. 3-5 specific bullet points of what to change in the current profile
3. A one-sentence rationale for your recommendations

Platform-specific requirements:
${platformGuidelines}

Return a JSON object with this exact structure:
{
  "audits": [
    {
      "platform": "twitter" | "instagram" | "linkedin" | "tiktok",
      "handle": "the handle as provided",
      "bio_recommendation": "The exact bio text they should use, ready to copy-paste",
      "what_to_change": ["specific change 1", "specific change 2", "specific change 3"],
      "why": "One sentence explaining the strategic rationale"
    }
  ]
}

Be specific and actionable. The bio_recommendation should be polished and immediately usable. The what_to_change items should be concrete improvements, not vague advice.`;

    const result = await callClaude<AuditResponse>({
      model: "sonnet",
      systemPrompt,
      userPrompt,
      maxTokens: 2048,
    });

    // Normalize handles in the response to match what was requested
    const auditsWithHandles = result.data.audits.map((audit, i) => ({
      ...audit,
      handle: platforms[i]?.handle ?? audit.handle,
    }));

    return NextResponse.json({ audits: auditsWithHandles });
  } catch (error) {
    logRouteError("social_audit_failed", error, {});
    return NextResponse.json({ error: "Failed to generate social audit" }, { status: 500 });
  }
}
