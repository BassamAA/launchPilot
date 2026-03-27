import { NextRequest, NextResponse } from "next/server";
import { logRouteError } from "@/lib/observability";
import { mapSitePatchError } from "@/lib/site-updates";
import { getAuthorizedSite, getUser, getSupabaseAdminClient } from "@/lib/supabase";

export async function GET(
  req: NextRequest,
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
      .select("*")
      .eq("id", params.id)
      .single();

    if (error || !data) return NextResponse.json({ error: "Site not found" }, { status: 404 });

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const site = await getAuthorizedSite(params.id);
    if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

    // Only allow client-safe fields to be updated
    const allowedFields = ["onboarding_json", "name"] as const;
    const update: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body) update[key] = body[key];
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
      .from("sites")
      .update(update)
      .eq("id", params.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    logRouteError("api_site_patch_failed", error, { site_id: params.id });
    const mapped = mapSitePatchError(error);
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
}
