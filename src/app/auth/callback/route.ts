import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getSupabaseAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const prefillUrl = searchParams.get("url")?.trim();

  if (code) {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const admin = getSupabaseAdminClient();

      // Check if user profile exists
      const { data: existingProfile } = await admin
        .from("user_profiles")
        .select("id")
        .eq("id", data.user.id)
        .single();

      if (!existingProfile) {
        const onboardingUrl = new URL(`${origin}/onboarding`);
        if (prefillUrl) onboardingUrl.searchParams.set("url", prefillUrl);
        return NextResponse.redirect(onboardingUrl);
      }

      if (prefillUrl) {
        return NextResponse.redirect(`${origin}/sites/new?prefill=${encodeURIComponent(prefillUrl)}`);
      }

      // Existing user — go straight to dashboard
      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
