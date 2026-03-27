import { NextResponse } from "next/server";
import { getUser, getSupabaseAdminClient } from "@/lib/supabase";

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdminClient();

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("subscription_tier, trial_ends_at, company_id")
    .eq("id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  // Count content generated this month across all sites in the company
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  let contentUsedThisMonth = 0;
  if (profile.company_id) {
    const { data: sites } = await supabase
      .from("sites")
      .select("id")
      .eq("company_id", profile.company_id);

    if (sites && sites.length > 0) {
      const siteIds = sites.map((s) => s.id);
      const { count } = await supabase
        .from("content_items")
        .select("id", { count: "exact", head: true })
        .in("site_id", siteIds)
        .neq("body", "")
        .gte("created_at", startOfMonth);
      contentUsedThisMonth = count || 0;
    }
  }

  return NextResponse.json({
    subscription_tier: profile.subscription_tier || "free_trial",
    trial_ends_at: profile.trial_ends_at || null,
    content_used_this_month: contentUsedThisMonth,
  });
}
