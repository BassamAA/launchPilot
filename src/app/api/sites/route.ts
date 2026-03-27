import { NextRequest, NextResponse } from "next/server";
import { getUser, getSupabaseAdminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

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

    const { data: sites, error } = await supabase
      .from("sites")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ sites: sites || [] });
  } catch (error) {
    console.error("[/api/sites]", error);
    return NextResponse.json({ error: "Failed to fetch sites" }, { status: 500 });
  }
}
