import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/claude";
import { logRouteError } from "@/lib/observability";
import { getSupabaseAdminClient, getUser } from "@/lib/supabase";
import { MarketingBrief, BusinessProfile } from "@/types";

export const maxDuration = 60;

interface PlatformAudit {
  platform: string;
  connected: boolean;
  handle: string;
  current_bio: string | null;
  recommended_bio: string;
  what_to_change: string[];
  why: string;
}

async function fetchTwitterBio(
  accessToken: string,
  accountId: string
): Promise<{ bio: string; username: string } | null> {
  try {
    const res = await fetch(
      `https://api.twitter.com/2/users/${accountId}?user.fields=description,username`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return {
      bio: json?.data?.description ?? "",
      username: json?.data?.username ?? "",
    };
  } catch {
    return null;
  }
}

async function fetchLinkedInHeadline(
  accessToken: string
): Promise<string | null> {
  try {
    const res = await fetch(
      "https://api.linkedin.com/v2/me?projection=(id,localizedHeadline)",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json?.localizedHeadline ?? null;
  } catch {
    return null;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getSupabaseAdminClient();

    const [{ data: site }, { data: connections }] = await Promise.all([
      supabase
        .from("sites")
        .select("brief_json, business_profile_json")
        .eq("id", params.id)
        .single(),
      supabase
        .from("platform_connections")
        .select("platform, access_token, account_id, account_name")
        .eq("site_id", params.id),
    ]);

    if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

    const brief = site.brief_json as MarketingBrief | null;
    const bp = site.business_profile_json as BusinessProfile | null;
    const productName = brief?.product_name || bp?.business_name || "the product";
    const targetCustomer = brief?.target_customer || bp?.target_audience || "the target audience";
    const oneliner = brief?.one_liner || bp?.description || "";
    const valueProps = brief?.value_proposition || "";
    const positioning = brief?.positioning || "";

    const connMap = Object.fromEntries(
      (connections || []).map((c) => [c.platform, c])
    );

    // Fetch real profile data in parallel
    const [twitterData, linkedInHeadline] = await Promise.all([
      connMap.twitter
        ? fetchTwitterBio(connMap.twitter.access_token, connMap.twitter.account_id)
        : Promise.resolve(null),
      connMap.linkedin
        ? fetchLinkedInHeadline(connMap.linkedin.access_token)
        : Promise.resolve(null),
    ]);

    // Build context for Claude
    const connectedSection = [
      connMap.twitter && `TWITTER (@${twitterData?.username || connMap.twitter.account_name})
Current bio (real, fetched from API): "${twitterData?.bio || "(empty)"}"`,
      connMap.linkedin && `LINKEDIN (${connMap.linkedin.account_name})
Current headline (real, fetched from API): "${linkedInHeadline || "(could not fetch — please provide recommendations without current data)"}"`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const notConnected = ["twitter", "linkedin", "instagram"]
      .filter((p) => !connMap[p]);

    const notConnectedSection = notConnected.length
      ? `NOT CONNECTED (no real data — generate ideal bio based on business only): ${notConnected.join(", ")}`
      : "";

    const systemPrompt =
      "You are a social media profile optimization expert. Analyze profile data and generate specific, copy-paste-ready bios and actionable change lists. Return ONLY valid JSON.";

    const userPrompt = `Audit these social profiles for this business and return specific optimization recommendations.

BUSINESS:
Product: ${productName}
One-liner: ${oneliner}
Target customer: ${targetCustomer}
Value proposition: ${valueProps}
Positioning: ${positioning}

${connectedSection ? `CONNECTED PROFILES (real current data):\n${connectedSection}` : ""}
${notConnectedSection ? `\n${notConnectedSection}` : ""}

Return this JSON (include ALL three platforms: twitter, linkedin, instagram):
{
  "audits": [
    {
      "platform": "twitter",
      "connected": true,
      "handle": "@username",
      "current_bio": "their actual bio or null if not connected",
      "recommended_bio": "exact 160-char bio ready to paste — hook + who you help + CTA/link mention",
      "what_to_change": [
        "Specific change 1 — e.g. 'Remove generic phrase X, replace with specific claim Y'",
        "Specific change 2",
        "Specific change 3"
      ],
      "why": "One sentence: the core reason the current bio underperforms"
    },
    {
      "platform": "linkedin",
      "connected": ${!!connMap.linkedin},
      "handle": "${connMap.linkedin?.account_name || "LinkedIn profile"}",
      "current_bio": "${linkedInHeadline || "null"}",
      "recommended_bio": "exact headline under 120 chars — title | who you help | result",
      "what_to_change": ["...", "...", "..."],
      "why": "..."
    },
    {
      "platform": "instagram",
      "connected": false,
      "handle": "@instagram_handle",
      "current_bio": null,
      "recommended_bio": "exact 150-char bio — hook line \\n target audience \\n CTA with link mention",
      "what_to_change": ["...", "...", "..."],
      "why": "..."
    }
  ]
}

For connected platforms with real bios: compare the actual bio directly against the ideal and name specific problems.
For unconnected platforms: skip current_bio critique, just give the ideal bio they should set up.`;

    const result = await callClaude<{ audits: PlatformAudit[] }>({
      model: "sonnet",
      systemPrompt,
      userPrompt,
      maxTokens: 2000,
    });

    return NextResponse.json(result.data);
  } catch (error) {
    logRouteError("profile_audit_failed", error, {});
    return NextResponse.json({ error: "Failed to generate audit" }, { status: 500 });
  }
}
