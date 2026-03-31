import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { callClaude } from "@/lib/claude";
import { logRouteError } from "@/lib/observability";
import { getSupabaseAdminClient, getUser } from "@/lib/supabase";
import { BusinessProfile, ContentItem, MarketingBrief } from "@/types";

export const maxDuration = 60;

const requestSchema = z.object({
  content_item_id: z.string().uuid(),
  prompt_type: z.enum(["image_prompt", "reel_prompt", "influencer_brief"]),
  influencer_style: z.string().trim().optional(),
});

async function generateImagePrompt(
  item: ContentItem,
  brief: MarketingBrief,
  businessProfile: BusinessProfile | null
): Promise<string> {
  const systemPrompt = `You are a creative director who writes image prompts for social content that actually earns attention. You understand composition, hierarchy, contrast, product storytelling, and what feels premium rather than generic on Instagram.

You MUST respond with ONLY the prompt text — no markdown, no explanation, no preamble. Just the image prompt.`;

  const productContext = businessProfile
    ? `Product: ${brief.product_name}\nAudience: ${businessProfile.target_audience}\nVoice: ${businessProfile.content_voice}`
    : `Product: ${brief.product_name}\nAudience: ${brief.target_customer}`;

  const userPrompt = `Write a detailed Midjourney/DALL-E image generation prompt for this Instagram post:

Post title: ${item.title}
Post body: ${item.body}
${productContext}

Requirements:
- Format: 1:1 square (1080x1080px, Instagram standard)
- Include: subject description, style, lighting, mood, color palette, composition
- The image must be relevant to the post topic and appeal to the target audience
- Style should match the brand voice and feel professional
- Prioritize a strong focal point, visual tension, and a concept that would stop someone mid-scroll
- Avoid generic stock-photo aesthetics, cheesy startup clichés, floating UI-on-gradient tropes, and overstuffed compositions
- Include "--ar 1:1" at the end for Midjourney

Generate a single, complete image prompt ready to paste into Midjourney or DALL-E.`;

  const result = await callClaude<string>({
    model: "sonnet",
    systemPrompt,
    userPrompt,
    maxTokens: 600,
  });

  if (typeof result.data === "string") return result.data;
  return JSON.stringify(result.data);
}

async function generateReelPrompt(
  item: ContentItem,
  brief: MarketingBrief,
  businessProfile: BusinessProfile | null
): Promise<string> {
  const systemPrompt = `You are a short-form video strategist and scriptwriter for founder-led brands. You write Instagram Reels that feel native to the platform: fast hook, visual movement, specific payoff, and no ad-speak. You know the first 1-3 seconds decide whether the viewer stays.

You MUST respond with ONLY the reel concept and script — no preamble, no markdown headers outside the structure below.`;

  const productContext = businessProfile
    ? `Product: ${brief.product_name}\nAudience: ${businessProfile.target_audience}\nVoice: ${businessProfile.content_voice}`
    : `Product: ${brief.product_name}\nAudience: ${brief.target_customer}`;

  const userPrompt = `Write a complete Reel concept and script for this Instagram post:

Post title: ${item.title}
Post content: ${item.body}
${productContext}

Format your response as:

HOOK (0-3 seconds):
[Exact words to say or show on screen — must stop the scroll]

OPENING VISUAL:
[What the viewer sees before you speak]

SCRIPT:
[Full voiceover or on-screen text, broken into timestamps. Keep total duration 30-60 seconds.]

B-ROLL SUGGESTIONS:
[3-5 specific shots to cut to while speaking]

CAPTION:
[Full Instagram caption with hook, body, and CTA]

ON-SCREEN TEXT:
[Text overlays to add in editing]

AUDIO RECOMMENDATION:
[Trending sound type or original voiceover guidance]

CTA:
[Exact words for the final call to action]

Quality bar:
- Make the hook specific and native to the target audience's pain, not broad motivational fluff
- Build in at least 3 visual beats so the Reel can cut between screens, gestures, b-roll, or text moments
- The script should sound like a smart creator or founder talking, not a landing page read aloud
- Avoid filler like "hey guys", "in today's video", and "let me show you"
- Make the payoff concrete: what the viewer learns, sees, or realizes by the end`;

  const result = await callClaude<string>({
    model: "sonnet",
    systemPrompt,
    userPrompt,
    maxTokens: 1200,
  });

  if (typeof result.data === "string") return result.data;
  return JSON.stringify(result.data);
}

async function generateInfluencerBrief(
  item: ContentItem,
  brief: MarketingBrief,
  businessProfile: BusinessProfile | null,
  influencerStyle: string | undefined
): Promise<string> {
  const systemPrompt = `You are a brand partnerships manager who writes creator briefs that are clear, commercially useful, and respectful of the creator's craft. Your briefs give strong direction without killing the creator's voice.

You MUST respond with ONLY the brief document — no preamble, no meta-commentary.`;

  const productContext = businessProfile
    ? `Product: ${brief.product_name}
Description: ${businessProfile.description}
Target audience: ${businessProfile.target_audience}
Pricing: ${businessProfile.pricing || "see product page"}
Social proof: ${businessProfile.social_proof?.slice(0, 3).join("; ") || "none specified"}`
    : `Product: ${brief.product_name}
One-liner: ${brief.one_liner}
Target audience: ${brief.target_customer}
Value proposition: ${brief.value_proposition}`;

  const styleNote = influencerStyle
    ? `\nInfluencer style/niche: ${influencerStyle}`
    : "";

  const userPrompt = `Write a complete influencer brief for this Instagram post/campaign:

Content to feature:
Title: ${item.title}
Description: ${item.body}

${productContext}${styleNote}

Write a complete influencer brief with the following sections:

CAMPAIGN OVERVIEW
[What this campaign is about and the goal]

PRODUCT OVERVIEW
[Key facts about the product the influencer needs to know]

CONTENT REQUIREMENTS
[Specific deliverables: format, duration, platform specs]

KEY MESSAGES
[3-5 must-communicate points — what the audience needs to walk away believing]

TALKING POINTS
[Specific angles, phrases, objections, scenes, and stories that resonate with the audience]

DOS AND DON'TS
[Clear guidance on brand voice, prohibited claims, competitor mentions]

HASHTAGS
[Required and suggested hashtags]

POSTING SCHEDULE
[When to post, timing guidance]

USAGE RIGHTS
[How the brand may repurpose the content]

COMPENSATION
[Placeholder — to be agreed separately]

NEXT STEPS
[What the influencer should do after receiving this brief]

Make the brief practical enough that a strong creator could immediately turn it into a good post without asking basic follow-up questions.`;

  const result = await callClaude<string>({
    model: "sonnet",
    systemPrompt,
    userPrompt,
    maxTokens: 2000,
  });

  if (typeof result.data === "string") return result.data;
  return JSON.stringify(result.data);
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { content_item_id, prompt_type, influencer_style } = parsed.data;
    const supabase = getSupabaseAdminClient();

    const { data: contentItem, error: contentError } = await supabase
      .from("content_items")
      .select("id, site_id, channel, content_type, title, body, metadata_json, status")
      .eq("id", content_item_id)
      .single();

    if (contentError || !contentItem) {
      return NextResponse.json({ error: "Content item not found" }, { status: 404 });
    }

    const { data: siteData, error: siteError } = await supabase
      .from("sites")
      .select("brief_json, business_profile_json, company_id")
      .eq("id", contentItem.site_id)
      .single();

    if (siteError || !siteData) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const brief = (siteData.brief_json as MarketingBrief | null | undefined) ?? null;
    if (!brief) {
      return NextResponse.json(
        { error: "Marketing brief not confirmed for this site" },
        { status: 400 }
      );
    }

    const businessProfile =
      (siteData.business_profile_json as BusinessProfile | null | undefined) ?? null;

    const item = contentItem as ContentItem;

    let prompt: string;
    if (prompt_type === "image_prompt") {
      prompt = await generateImagePrompt(item, brief, businessProfile);
    } else if (prompt_type === "reel_prompt") {
      prompt = await generateReelPrompt(item, brief, businessProfile);
    } else {
      prompt = await generateInfluencerBrief(item, brief, businessProfile, influencer_style);
    }

    return NextResponse.json({ prompt });
  } catch (error) {
    logRouteError("api_instagram_content_prompt_failed", error, {});
    return NextResponse.json({ error: "Failed to generate prompt" }, { status: 500 });
  }
}
