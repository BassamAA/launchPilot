import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { hasLinkedInOAuthEnv } from "@/lib/linkedin-auth";
import { getAuthorizedSite, getUser } from "@/lib/supabase";

function getAppUrl(req: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
}

function getLinkedInCallbackUrl(req: NextRequest) {
  return `${getAppUrl(req)}/api/auth/linkedin/callback`;
}

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const siteId = req.nextUrl.searchParams.get("siteId");
  if (!siteId) return NextResponse.json({ error: "siteId required" }, { status: 400 });

  const site = await getAuthorizedSite(siteId);
  if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

  if (!hasLinkedInOAuthEnv()) {
    const settingsUrl = new URL(`/sites/${site.id}/settings`, req.url);
    settingsUrl.searchParams.set("tab", "connections");
    settingsUrl.searchParams.set("error", "linkedin_not_configured");
    return NextResponse.redirect(settingsUrl);
  }

  const state = `${site.id}:${crypto.randomBytes(16).toString("hex")}`;
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.LINKEDIN_CLIENT_ID!,
    redirect_uri: getLinkedInCallbackUrl(req),
    scope: "openid profile w_member_social",
    state,
  });

  const response = NextResponse.redirect(
    `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`
  );
  response.cookies.set("li_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 1800,
    path: "/",
    sameSite: "lax",
  });

  return response;
}
