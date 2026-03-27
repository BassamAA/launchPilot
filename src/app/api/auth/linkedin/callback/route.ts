import { NextRequest, NextResponse } from "next/server";
import { encryptSecret } from "@/lib/crypto";
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
  const user = await getUser();
  const appOrigin = getAppUrl(req);
  if (!user) return NextResponse.redirect(`${appOrigin}/login`);

  if (!hasLinkedInOAuthEnv()) {
    return NextResponse.redirect(`${appOrigin}/dashboard?error=linkedin_not_configured`);
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${appOrigin}/dashboard?error=linkedin_denied`);
  }

  const storedState = req.cookies.get("li_state")?.value;
  if (!code || !state || state !== storedState) {
    return NextResponse.redirect(`${appOrigin}/dashboard?error=linkedin_invalid_state`);
  }

  const siteId = state.split(":")[0];
  const site = await getAuthorizedSite(siteId);
  if (!site) {
    return NextResponse.redirect(`${appOrigin}/dashboard?error=linkedin_invalid_site`);
  }

  const tokenResponse = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
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
    logStructured("error", "linkedin_token_exchange_failed", {
      siteId,
      status: tokenResponse.status,
      body,
    });
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
    return NextResponse.redirect(
      `${appOrigin}/sites/${siteId}/settings?tab=connections&error=linkedin_token`
    );
  }

  const userResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
    },
  });

  if (!userResponse.ok) {
    const body = await userResponse.text();
    logStructured("error", "linkedin_userinfo_failed", {
      siteId,
      status: userResponse.status,
      body,
    });
    return NextResponse.redirect(
      `${appOrigin}/sites/${siteId}/settings?tab=connections&error=linkedin_profile`
    );
  }

  const profile = (await userResponse.json()) as LinkedInUserInfo;
  if (!profile.sub) {
    return NextResponse.redirect(
      `${appOrigin}/sites/${siteId}/settings?tab=connections&error=linkedin_profile`
    );
  }

  const personUrn = `urn:li:person:${profile.sub}`;
  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null;

  const supabase = getSupabaseAdminClient();
  await supabase.from("platform_connections").upsert(
    {
      site_id: site.id,
      platform: "linkedin",
      access_token_encrypted: encryptSecret(tokens.access_token),
      refresh_token_encrypted: encryptSecret(null),
      expires_at: expiresAt,
      platform_user_id: personUrn,
      platform_username: profile.name || "LinkedIn profile",
      metadata_json: {
        scopes: tokens.scope ? tokens.scope.split(" ") : [],
        scope_string: tokens.scope || null,
      },
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "site_id,platform" }
  );

  const redirect = NextResponse.redirect(
    `${appOrigin}/sites/${site.id}/settings?tab=connections&connected=linkedin`
  );
  redirect.cookies.delete("li_state");
  return redirect;
}
