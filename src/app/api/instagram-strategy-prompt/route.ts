import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { callClaude } from "@/lib/claude";
import { logRouteError } from "@/lib/observability";
import { getSupabaseAdminClient, getUser } from "@/lib/supabase";
import { BusinessProfile, MarketingBrief } from "@/types";

export const maxDuration = 60;

const requestSchema = z.object({
  site_id: z.string().uuid(),
  concept: z.string().min(1),
  caption: z.string().default(""),
  prompt_type: z.enum(["image_prompt", "reel_prompt", "influencer_brief"]),
  influencer_style: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const { site_id, concept, caption, prompt_type, influencer_style } = parsed.data;

    const supabase = getSupabaseAdminClient();
    const { data: site } = await supabase
      .from("sites")
      .select("brief_json, business_profile_json")
      .eq("id", site_id)
      .single();

    if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

    const brief = site.brief_json as MarketingBrief | null;
    const bp = site.business_profile_json as BusinessProfile | null;
    const productName = brief?.product_name || bp?.business_name || "the product";
    const audience = bp?.target_audience || brief?.target_customer || "the target audience";
    const voice = bp?.content_voice || "professional, founder-led";

    let systemPrompt: string;
    let userPrompt: string;

    if (prompt_type === "image_prompt") {
      systemPrompt = `You are a creative director writing Midjourney/DALL-E prompts for Instagram. Respond with ONLY the prompt — no explanation, no preamble.`;
      userPrompt = `Write a Midjourney/DALL-E image prompt for this Instagram post:

Concept: ${concept}
Caption: ${caption}
Product: ${productName}
Audience: ${audience}
Brand voice: ${voice}

Requirements: 1:1 square, professional, scroll-stopping, relevant to concept, brand-appropriate. End with "--ar 1:1 --style raw" for Midjourney.`;
    } else if (prompt_type === "reel_prompt") {
      systemPrompt = `You are a Reels scriptwriter for founder-led brands. Respond with ONLY the script/concept — no meta-commentary.`;
      userPrompt = `Write a complete Reel concept for this Instagram post:

Concept: ${concept}
Caption: ${caption}
Product: ${productName}
Audience: ${audience}

Format:
HOOK (0-3s): [exact on-screen words or action]
OPENING VISUAL: [what viewer sees]
SCRIPT: [full voiceover broken by timestamp, 30-60s total]
B-ROLL: [3-5 specific shots]
ON-SCREEN TEXT: [text overlays]
CAPTION: [full caption]
AUDIO: [sound recommendation]
CTA: [final call to action]`;
    } else {
      systemPrompt = `You are a brand partnerships manager writing influencer briefs. Respond with ONLY the brief document.`;
      const styleNote = influencer_style ? `\nInfluencer profile: ${influencer_style}` : "";
      userPrompt = `Write a complete influencer brief for this Instagram campaign:

Concept: ${concept}
Caption: ${caption}
Product: ${productName}
Audience: ${audience}${styleNote}

Include: Campaign Overview, Product Overview, Content Requirements, Key Messages (3-5), Talking Points, Dos and Don'ts, Required Hashtags, Posting Schedule, Usage Rights, Compensation (placeholder), Next Steps.`;
    }

    const result = await callClaude<string>({
      model: "sonnet",
      systemPrompt,
      userPrompt,
      maxTokens: prompt_type === "influencer_brief" ? 2000 : 1200,
    });

    const prompt = typeof result.data === "string" ? result.data : JSON.stringify(result.data);
    return NextResponse.json({ prompt });
  } catch (error) {
    logRouteError("instagram_strategy_prompt_failed", error, {});
    return NextResponse.json({ error: "Failed to generate prompt" }, { status: 500 });
  }
}
