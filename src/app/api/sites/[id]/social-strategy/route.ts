import { NextRequest, NextResponse } from "next/server";
import { logRouteError } from "@/lib/observability";
import {
  generateInstagramStrategy,
  generateLinkedInStrategy,
  generateYouTubeStrategy,
} from "@/lib/generators/instagram";
import {
  SocialStrategyPlatform,
  mergeSocialStrategy,
  normalizeSocialStrategyState,
} from "@/lib/social-strategy";
import { getAuthorizedSite, getSupabaseAdminClient, getUser } from "@/lib/supabase";
import { socialStrategyGenerateSchema } from "@/lib/validation";
import { BusinessProfile, MarketingBrief } from "@/types";

export const maxDuration = 120;

async function generatePlatformStrategy(
  platform: SocialStrategyPlatform,
  brief: MarketingBrief,
  businessProfile: BusinessProfile | null
) {
  if (platform === "instagram") return generateInstagramStrategy(brief, businessProfile);
  if (platform === "youtube") return generateYouTubeStrategy(brief, businessProfile);
  return generateLinkedInStrategy(brief, businessProfile);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const site = await getAuthorizedSite(params.id);
    if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("sites")
      .select("social_strategy_json")
      .eq("id", params.id)
      .single();

    if (error) throw error;

    return NextResponse.json(normalizeSocialStrategyState(data?.social_strategy_json));
  } catch (error) {
    logRouteError("api_site_social_strategy_get_failed", error, { site_id: params.id });
    return NextResponse.json({ error: "Failed to load social strategy" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const site = await getAuthorizedSite(params.id);
    if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

    const parsed = socialStrategyGenerateSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid social strategy request" }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("sites")
      .select("brief_json, business_profile_json, social_strategy_json")
      .eq("id", params.id)
      .single();

    if (error) throw error;

    const brief = (data?.brief_json as MarketingBrief | null | undefined) ?? null;
    const businessProfile =
      (data?.business_profile_json as BusinessProfile | null | undefined) ?? null;

    if (!brief) {
      return NextResponse.json(
        { error: "Confirm the marketing brief before generating social strategy" },
        { status: 400 }
      );
    }

    const { platform } = parsed.data;
    const strategy = await generatePlatformStrategy(platform, brief, businessProfile);
    const socialStrategyJson = mergeSocialStrategy(data?.social_strategy_json, platform, strategy);

    const { error: updateError } = await supabase
      .from("sites")
      .update({
        social_strategy_json: socialStrategyJson,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id);

    if (updateError) throw updateError;

    return NextResponse.json({ platform, strategy });
  } catch (error) {
    logRouteError("api_site_social_strategy_post_failed", error, { site_id: params.id });
    return NextResponse.json({ error: "Failed to generate social strategy" }, { status: 500 });
  }
}
