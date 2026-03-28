import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/claude";
import { logRouteError } from "@/lib/observability";
import { getSupabaseAdminClient, getUser } from "@/lib/supabase";
import { MarketingBrief, BusinessProfile } from "@/types";

export const maxDuration = 60;

interface AngleGap {
  angle: string;
  why_it_matters: string;
  what_youre_missing: string;
  action_steps: string[];
  content_ideas: string[];
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getSupabaseAdminClient();

    const { data: site } = await supabase
      .from("sites")
      .select("brief_json, business_profile_json, social_strategy_json")
      .eq("id", params.id)
      .single();

    if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

    const brief = site.brief_json as MarketingBrief | null;
    const bp = site.business_profile_json as BusinessProfile | null;

    if (!brief && !bp) {
      return NextResponse.json({ gaps: [] });
    }

    const productName = brief?.product_name || bp?.business_name || "the product";
    const targetCustomer = brief?.target_customer || bp?.target_audience || "the target audience";
    const oneliner = brief?.one_liner || bp?.description || "";
    const valueProps = brief?.value_proposition || "";
    const positioning = brief?.positioning || "";
    const painPoint = brief?.pain_point || "";
    const contentAngles = (brief?.content_angles ?? []).join(", ");

    // Extract existing content pillars from any generated strategy
    const existingPillars: string[] = [];
    const socialState = site.social_strategy_json as Record<string, unknown> | null;
    if (socialState) {
      for (const platform of ["instagram", "twitter", "linkedin"]) {
        const entry = (socialState as Record<string, { strategy_json?: { content_pillars?: Array<{ name: string }> } }>)[platform];
        if (entry?.strategy_json?.content_pillars) {
          entry.strategy_json.content_pillars.forEach((p) => {
            if (p.name) existingPillars.push(p.name);
          });
        }
      }
    }

    const systemPrompt = `You are a marketing strategist who specializes in diagnosing content and positioning gaps for early-stage businesses. You identify specific angles they are NOT covering that their competitors use to win. Return ONLY valid JSON.`;

    const userPrompt = `Analyze this business and identify the 5-6 most important marketing angles they are MISSING or completely underdeveloped.

BUSINESS:
Product: ${productName}
One-liner: ${oneliner}
Target customer: ${targetCustomer}
Pain point addressed: ${painPoint}
Value proposition: ${valueProps}
Positioning: ${positioning}
${contentAngles ? `Existing content angles: ${contentAngles}` : ""}
${existingPillars.length ? `\nContent pillars they ALREADY have: ${existingPillars.join(", ")}` : ""}

ANGLE TYPES to consider (pick whichever are most impactful and MISSING for this business):
- Founder/personal brand story angle
- Social proof / results / case study angle
- Education / "how to" angle (teach something related to their product)
- Pain agitation angle (dramatize the problem before introducing the solution)
- Competitor comparison / "why not X" angle
- Behind-the-scenes / transparency angle (build in public)
- Community / shared identity angle (we vs them)
- Trend hijacking angle (connect to current relevant trends)
- Data / research / statistics angle
- Objection handling angle (address the #1 reason people don't buy)
- Aspirational transformation angle (the life after buying)
- Urgency / FOMO angle
- Niche authority angle (become the known expert in a very specific sub-niche)

For each MISSING angle, explain why it specifically matters for THIS business and give concrete content ideas they could make TODAY.

Return JSON:
{
  "gaps": [
    {
      "angle": "Angle name — short, specific",
      "why_it_matters": "Why this specific angle is critical for THIS business and target customer — 2 sentences",
      "what_youre_missing": "What they currently lack — 1 sentence describing the gap",
      "action_steps": [
        "Specific first thing to do to activate this angle",
        "Second step",
        "Third step"
      ],
      "content_ideas": [
        "Specific post/content idea using this angle — written out as a concept",
        "Second specific idea",
        "Third specific idea"
      ]
    }
  ]
}

Return exactly 5-6 gaps. Make every recommendation specific to ${productName} and ${targetCustomer} — no generic advice.`;

    const result = await callClaude<{ gaps: AngleGap[] }>({
      model: "sonnet",
      systemPrompt,
      userPrompt,
      maxTokens: 3000,
    });

    return NextResponse.json(result.data);
  } catch (error) {
    logRouteError("angle_gaps_failed", error, {});
    return NextResponse.json({ error: "Failed to analyze angles" }, { status: 500 });
  }
}
