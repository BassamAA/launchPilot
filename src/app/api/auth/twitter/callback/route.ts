import { NextRequest, NextResponse } from "next/server";
import { getAuthorizedSite, getUser, getSupabaseAdminClient } from "@/lib/supabase";
import { getTwitterCallbackUrl } from "@/lib/publishing";
import { hasTwitterOAuthEnv } from "@/lib/twitter-auth";
import { logStructured } from "@/lib/observability";

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

  const twitterClientId = process.env.TWITTER_CLIENT_ID!.trim();
  const twitterClientSecret = (process.env.TWITTER_CLIENT_SECRET || "").trim();

  // Build token request — confidential client uses Basic auth, public client uses body only
  const tokenHeaders: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };
  if (twitterClientSecret) {
    tokenHeaders["Authorization"] = `Basic ${Buffer.from(
      `${twitterClientId}:${twitterClientSecret}`
    ).toString("base64")}`;
  }

  const tokenBody = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: getTwitterCallbackUrl(),
    code_verifier: codeVerifier,
    client_id: twitterClientId,
  });

  // Exchange code for tokens
  const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: tokenHeaders,
    body: tokenBody,
  });

  if (!tokenRes.ok) {
    const errBody = await tokenRes.text();
    logStructured("error", "twitter_token_exchange_failed", { siteId, status: tokenRes.status, body: errBody });
    // Pass the raw Twitter error so it's visible in the UI banner
    const twitterError = encodeURIComponent(errBody.slice(0, 200));
    return NextResponse.redirect(
      `${appOrigin}/sites/${siteId}/settings?tab=connections&error=twitter_token&twitter_error=${twitterError}`
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
  const { error: upsertError } = await supabase.from("platform_connections").upsert(
    {
      site_id: site.id,
      platform: "twitter",
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      token_expires_at: expiresAt,
      account_id: twitterUser?.id || null,
      account_name: twitterUser?.username ? `@${twitterUser.username}` : null,
      scopes: tokens.scope ? tokens.scope.split(" ") : [],
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "site_id,platform" }
  );

  if (upsertError) {
    logStructured("error", "twitter_connection_save_failed", {
      siteId: site.id,
      error: upsertError.message,
      code: upsertError.code,
    });
    const errRedirect = NextResponse.redirect(
      `${appOrigin}/sites/${site.id}/settings?tab=connections&error=twitter_save_failed`
    );
    errRedirect.cookies.delete("tw_code_verifier");
    errRedirect.cookies.delete("tw_state");
    return errRedirect;
  }

  const redirect = NextResponse.redirect(
    `${appOrigin}/sites/${site.id}/settings?tab=connections&connected=twitter`
  );
  // Clear cookies
  redirect.cookies.delete("tw_code_verifier");
  redirect.cookies.delete("tw_state");
  return redirect;
}
