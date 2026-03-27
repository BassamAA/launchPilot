import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getSupabaseAdminClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { company_name, timezone } = await req.json();

  if (!company_name?.trim()) {
    return NextResponse.json({ error: "Company name is required" }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();

  // Check if profile already exists (idempotent)
  const { data: existingProfile } = await admin
    .from("user_profiles")
    .select("id, company_id")
    .eq("id", user.id)
    .single();

  if (existingProfile?.company_id) {
    // Already set up — update company name + timezone only
    await admin
      .from("companies")
      .update({ name: company_name.trim(), timezone: timezone || "UTC" })
      .eq("id", existingProfile.company_id);

    return NextResponse.json({ success: true });
  }

  // Create company
  const { data: company, error: companyError } = await admin
    .from("companies")
    .insert({ name: company_name.trim(), timezone: timezone || "UTC" })
    .select()
    .single();

  if (companyError || !company) {
    console.error("Company creation failed:", companyError);
    return NextResponse.json({ error: "Failed to create workspace" }, { status: 500 });
  }

  // Create user profile
  const { error: profileError } = await admin.from("user_profiles").insert({
    id: user.id,
    company_id: company.id,
    name: user.user_metadata?.name || null,
    role: "owner",
    subscription_tier: "free_trial",
    trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });

  if (profileError) {
    console.error("Profile creation failed:", profileError);
    // Clean up company if profile failed
    await admin.from("companies").delete().eq("id", company.id);
    return NextResponse.json({ error: "Failed to create profile" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
