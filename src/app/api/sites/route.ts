import { NextRequest, NextResponse } from "next/server";
import { getUser, getSupabaseAdminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const DEFAULT_SITES_LIMIT = 50;
const MAX_SITES_LIMIT = 200;

function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getSupabaseAdminClient();

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ sites: [] });
    }

    const { searchParams } = new URL(req.url);
    const page = parsePositiveInt(searchParams.get("page"), 1);
    const requestedLimit = parsePositiveInt(searchParams.get("limit"), DEFAULT_SITES_LIMIT);
    const limit = Math.min(requestedLimit, MAX_SITES_LIMIT);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: sites, error, count } = await supabase
      .from("sites")
      .select("*", { count: "exact" })
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: true })
      .range(from, to);

    if (error) throw error;

    const fallbackTotal = from + (sites?.length || 0);

    return NextResponse.json({
      sites: sites || [],
      page,
      limit,
      total: typeof count === "number" ? count : fallbackTotal,
      has_more: typeof count === "number" ? to + 1 < count : (sites?.length || 0) === limit,
    });
  } catch (error) {
    console.error("[/api/sites]", error);
    return NextResponse.json({ error: "Failed to fetch sites" }, { status: 500 });
  }
}
