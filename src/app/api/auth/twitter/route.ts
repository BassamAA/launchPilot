import { NextRequest, NextResponse } from "next/server";
import { getAuthorizedSite, getUser } from "@/lib/supabase";
import { getTwitterCallbackUrl } from "@/lib/publishing";
import crypto from "crypto";

// Twitter OAuth 2.0 PKCE — step 1: redirect to Twitter
export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get("site_id");
  if (!siteId) return NextResponse.json({ error: "site_id required" }, { status: 400 });

  const site = await getAuthorizedSite(siteId);
  if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

  // Generate PKCE values
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");

  const state = `${site.id}:${crypto.randomBytes(16).toString("hex")}`;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.TWITTER_CLIENT_ID!,
    redirect_uri: getTwitterCallbackUrl(),
    scope: "tweet.read tweet.write users.read offline.access",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  const res = NextResponse.redirect(
    `https://twitter.com/i/oauth2/authorize?${params.toString()}`
  );

  // Store verifier + state in secure cookies (30-min TTL)
  res.cookies.set("tw_code_verifier", codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 1800,
    path: "/",
    sameSite: "lax",
  });
  res.cookies.set("tw_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 1800,
    path: "/",
    sameSite: "lax",
  });

  return res;
}
