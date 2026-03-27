import { NextRequest, NextResponse } from "next/server";
import { getAuthorizedSite, getUser, getSupabaseAdminClient } from "@/lib/supabase";
import { encryptSecret } from "@/lib/crypto";
import { getTwitterCallbackUrl } from "@/lib/publishing";
import { hasTwitterOAuthEnv } from "@/lib/twitter-auth";

// Twitter OAuth 2.0 PKCE — step 2: exchange code for tokens
export async function GET(req: NextRequest) {
  const user = await getUser();
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  if (!user) return NextResponse.redirect(`${appOrigin}/login`);

  if (!hasTwitterOAuthEnv()) {
    return NextResponse.redirect(`${appOrigin}/dashboard?error=twitter_not_configured`);
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      `${appOrigin}/dashboard?error=twitter_denied`
    );
  }

  const storedState = req.cookies.get("tw_state")?.value;
  const codeVerifier = req.cookies.get("tw_code_verifier")?.value;

  if (!state || state !== storedState || !codeVerifier || !code) {
    return NextResponse.redirect(
      `${appOrigin}/dashboard?error=twitter_invalid_state`
    );
  }

  // site_id is the first segment of state
  const siteId = state.split(":")[0];
  const site = await getAuthorizedSite(siteId);

  if (!site) {
    return NextResponse.redirect(
      `${appOrigin}/dashboard?error=twitter_invalid_site`
    );
  }

  // Exchange code for tokens
  const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`
      ).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: getTwitterCallbackUrl(),
      code_verifier: codeVerifier,
      client_id: process.env.TWITTER_CLIENT_ID!,
    }),
  });

  if (!tokenRes.ok) {
    console.error("[twitter/callback] token exchange failed", await tokenRes.text());
    return NextResponse.redirect(
      `${appOrigin}/sites/${siteId}/settings?tab=connections&error=twitter_token`
    );
  }

  const tokens = await tokenRes.json();

  // Fetch Twitter user info
  const userRes = await fetch("https://api.twitter.com/2/users/me", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const twitterUser = userRes.ok ? (await userRes.json()).data : null;

  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null;

  const supabase = getSupabaseAdminClient();
  await supabase.from("platform_connections").upsert(
    {
      site_id: site.id,
      platform: "twitter",
      access_token_encrypted: encryptSecret(tokens.access_token),
      refresh_token_encrypted: encryptSecret(tokens.refresh_token || null),
      expires_at: expiresAt,
      platform_user_id: twitterUser?.id || null,
      platform_username: twitterUser?.username ? `@${twitterUser.username}` : null,
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
    `${appOrigin}/sites/${site.id}/settings?tab=connections&connected=twitter`
  );
  // Clear cookies
  redirect.cookies.delete("tw_code_verifier");
  redirect.cookies.delete("tw_state");
  return redirect;
}
