import { NextRequest, NextResponse } from "next/server";
import { hasLinkedInOAuthEnv } from "@/lib/linkedin-auth";
import { logStructured } from "@/lib/observability";
import { getAuthorizedSite, getSupabaseAdminClient, getUser } from "@/lib/supabase";

function getAppUrl(req: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
}

function getLinkedInCallbackUrl(req: NextRequest) {
  return `${getAppUrl(req)}/api/auth/linkedin/callback`;
}

interface LinkedInUserInfo {
  sub?: string;
  name?: string;
}

export async function GET(req: NextRequest) {
  const appOrigin = getAppUrl(req);

  logStructured("info", "linkedin_callback_start", { url: req.url });

  const user = await getUser();
  if (!user) {
    logStructured("warn", "linkedin_callback_no_user", {});
    return NextResponse.redirect(`${appOrigin}/login`);
  }
  logStructured("info", "linkedin_callback_user_ok", { userId: user.id });

  if (!hasLinkedInOAuthEnv()) {
    logStructured("warn", "linkedin_callback_env_missing", {});
    return NextResponse.redirect(`${appOrigin}/dashboard?error=linkedin_not_configured`);
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    logStructured("warn", "linkedin_callback_oauth_error", { error });
    return NextResponse.redirect(`${appOrigin}/dashboard?error=linkedin_denied`);
  }

  const storedState = req.cookies.get("li_state")?.value;
  logStructured("info", "linkedin_callback_state_check", {
    hasCode: !!code,
    hasState: !!state,
    hasStoredState: !!storedState,
    stateMatch: state === storedState,
  });

  if (!code || !state || state !== storedState) {
    return NextResponse.redirect(`${appOrigin}/dashboard?error=linkedin_invalid_state`);
  }

  const siteId = state.split(":")[0];
  const site = await getAuthorizedSite(siteId);
  logStructured("info", "linkedin_callback_site_check", { siteId, siteFound: !!site });

  if (!site) {
    return NextResponse.redirect(`${appOrigin}/dashboard?error=linkedin_invalid_site`);
  }

  const tokenResponse = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: getLinkedInCallbackUrl(req),
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    }),
  });

  if (!tokenResponse.ok) {
    const body = await tokenResponse.text();
    logStructured("error", "linkedin_token_exchange_failed", { siteId, status: tokenResponse.status, body });
    return NextResponse.redirect(
      `${appOrigin}/sites/${siteId}/settings?tab=connections&error=linkedin_token`
    );
  }

  const tokens = (await tokenResponse.json()) as {
    access_token?: string;
    expires_in?: number;
    scope?: string;
  };

  if (!tokens.access_token) {
    logStructured("error", "linkedin_callback_no_access_token", { siteId });
    return NextResponse.redirect(
      `${appOrigin}/sites/${siteId}/settings?tab=connections&error=linkedin_token`
    );
  }
  logStructured("info", "linkedin_callback_token_ok", { siteId, scope: tokens.scope });

  const userResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!userResponse.ok) {
    const body = await userResponse.text();
    logStructured("error", "linkedin_userinfo_failed", { siteId, status: userResponse.status, body });
    return NextResponse.redirect(
      `${appOrigin}/sites/${siteId}/settings?tab=connections&error=linkedin_profile`
    );
  }

  const profile = (await userResponse.json()) as LinkedInUserInfo;
  logStructured("info", "linkedin_callback_profile_ok", { siteId, sub: profile.sub, name: profile.name });

  if (!profile.sub) {
    return NextResponse.redirect(
      `${appOrigin}/sites/${siteId}/settings?tab=connections&error=linkedin_profile`
    );
  }

  const tokenExpiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null;

  const supabase = getSupabaseAdminClient();
  const { error: upsertError } = await supabase.from("platform_connections").upsert(
    {
      site_id: site.id,
      platform: "linkedin",
      access_token: tokens.access_token,
      refresh_token: null,
      token_expires_at: tokenExpiresAt,
      account_id: profile.sub,
      account_name: profile.name || "LinkedIn profile",
      scopes: tokens.scope ? tokens.scope.split(" ") : [],
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "site_id,platform" }
  );

  if (upsertError) {
    logStructured("error", "linkedin_connection_save_failed", {
      siteId: site.id,
      error: upsertError.message,
      code: upsertError.code,
    });
    const errRedirect = NextResponse.redirect(
      `${appOrigin}/sites/${siteId}/settings?tab=connections&error=linkedin_save_failed`
    );
    errRedirect.cookies.delete("li_state");
    return errRedirect;
  }

  logStructured("info", "linkedin_connection_saved", { siteId: site.id });

  const redirect = NextResponse.redirect(
    `${appOrigin}/sites/${site.id}/settings?tab=connections&connected=linkedin`
  );
  redirect.cookies.delete("li_state");
  return redirect;
}
