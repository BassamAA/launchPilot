import { NextRequest, NextResponse } from "next/server";
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

    const { data: plan } = await supabase
      .from("marketing_plans")
      .select("*")
      .eq("site_id", params.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!plan) return NextResponse.json({ plan: null, items: [] });

    const { data: items } = await supabase
      .from("content_items")
      .select("*")
      .eq("plan_id", plan.id)
      .order("scheduled_date", { ascending: true });

    const planItems = items || [];
    const isIncompletePlan =
      !plan.strategy_json ||
      (Array.isArray(planItems) && planItems.length === 0);

    if (isIncompletePlan) {
      return NextResponse.json({ plan: null, items: [] });
    }

    return NextResponse.json({ plan, items: planItems });
  } catch {
    return NextResponse.json({ error: "Failed to fetch plan" }, { status: 500 });
  }
}
