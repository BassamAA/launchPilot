import { NextRequest, NextResponse } from "next/server";
import { logRouteError } from "@/lib/observability";
import { getAuthorizedSite, getUser, getSupabaseAdminClient } from "@/lib/supabase";
import { surfacePatchSchema } from "@/lib/validation";

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
      .from("growth_surfaces")
      .select("*")
      .eq("site_id", params.id)
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ surfaces: data || [] });
  } catch (error) {
    logRouteError("api_surfaces_get_failed", error, { site_id: params.id });
    return NextResponse.json({ error: "Failed to fetch growth surfaces" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const site = await getAuthorizedSite(params.id);
    if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

    const parsed = surfacePatchSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid surface update", issues: parsed.error.flatten() }, { status: 400 });
    }
    const { surfaceId, status, priority } = parsed.data;

    const supabase = getSupabaseAdminClient();
    const update: { status: typeof status; priority?: number; last_reviewed_at?: string } = {
      status,
      last_reviewed_at: new Date().toISOString(),
    };
    if (typeof priority === "number" && Number.isFinite(priority)) {
      update.priority = priority;
    }

    const { error } = await supabase
      .from("growth_surfaces")
      .update(update)
      .eq("id", surfaceId)
      .eq("site_id", params.id);

    if (error) throw error;

    const { data } = await supabase
      .from("growth_surfaces")
      .select("*")
      .eq("site_id", params.id)
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true });

    await supabase.from("activity_log").insert({
      site_id: params.id,
      action: "growth_surface_updated",
      description: `Growth surface status updated to ${status}`,
      metadata_json: { surface_id: surfaceId, status, priority: update.priority ?? null },
    });

    return NextResponse.json({ surfaces: data || [] });
  } catch (error) {
    logRouteError("api_surfaces_patch_failed", error, { site_id: params.id });
    return NextResponse.json({ error: "Failed to update growth surfaces" }, { status: 500 });
  }
}
