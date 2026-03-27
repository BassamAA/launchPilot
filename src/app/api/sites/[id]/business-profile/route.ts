import { NextRequest, NextResponse } from "next/server";
import { logRouteError } from "@/lib/observability";
import { getAuthorizedSite, getUser, getSupabaseAdminClient } from "@/lib/supabase";
import { businessProfilePatchSchema } from "@/lib/validation";
import { BusinessProfile, MarketingBrief } from "@/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const site = await getAuthorizedSite(params.id);
    if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

    const parsed = businessProfilePatchSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid business profile update" }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const { data: currentSite } = await supabase
      .from("sites")
      .select("brief_json, business_profile_json")
      .eq("id", params.id)
      .single();

    const currentProfile = ((currentSite?.business_profile_json || {}) as BusinessProfile | null) || null;
    if (!currentProfile) {
      return NextResponse.json({ error: "Business profile not found" }, { status: 404 });
    }

    const updates = parsed.data;
    const nextProfile: BusinessProfile = {
      ...currentProfile,
      target_audience: updates.target_audience || currentProfile.target_audience,
      description: updates.description || currentProfile.description,
      business_type: updates.business_type || currentProfile.business_type,
      monetization_model: updates.monetization_model || currentProfile.monetization_model,
    };

    const nextBrief = {
      ...((currentSite?.brief_json || {}) as MarketingBrief),
      target_customer:
        updates.target_audience ||
        ((currentSite?.brief_json || {}) as MarketingBrief).target_customer,
      one_liner:
        updates.description || ((currentSite?.brief_json || {}) as MarketingBrief).one_liner,
      business_type:
        updates.business_type || ((currentSite?.brief_json || {}) as MarketingBrief).business_type,
      monetization_model:
        updates.monetization_model ||
        ((currentSite?.brief_json || {}) as MarketingBrief).monetization_model,
    } as MarketingBrief;

    await supabase
      .from("sites")
      .update({
        business_profile_json: nextProfile,
        brief_json: nextBrief,
      })
      .eq("id", params.id);

    return NextResponse.json({ business_profile: nextProfile, brief: nextBrief });
  } catch (error) {
    logRouteError("api_business_profile_patch_failed", error, { site_id: params.id });
    return NextResponse.json({ error: "Failed to update business profile" }, { status: 500 });
  }
}
