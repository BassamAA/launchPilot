import { NextRequest, NextResponse } from "next/server";
import { logRouteError } from "@/lib/observability";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp, getVisitorHash, parseJsonBody } from "@/lib/request";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { pageViewTrackSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const rate = checkRateLimit(`pageviews:${clientIp}`, 80, 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const parsed = pageViewTrackSchema.safeParse(await parseJsonBody(req));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid page view payload", issues: parsed.error.flatten() }, { status: 400 });
    }
    const body = parsed.data;
    const contentItemId = body.content_item_id;

    const supabase = getSupabaseAdminClient();
    const { data: contentItem } = await supabase
      .from("content_items")
      .select("id, site_id, channel, status")
      .eq("id", contentItemId)
      .eq("channel", "blog")
      .eq("status", "published")
      .maybeSingle();

    if (!contentItem) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const visitorHash = getVisitorHash(clientIp);
    const now = new Date();
    const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();

    const { data: existingView } = await supabase
      .from("page_views")
      .select("id")
      .eq("content_item_id", contentItemId)
      .eq("visitor_hash", visitorHash)
      .gte("viewed_at", dayStart)
      .limit(1)
      .maybeSingle();

    if (existingView) {
      return NextResponse.json({ ok: true, deduped: true });
    }

    await supabase.from("page_views").insert({
      content_item_id: contentItemId,
      site_id: contentItem.site_id,
      visitor_hash: visitorHash,
      referrer:
        (typeof body?.referrer === "string" && body.referrer) ||
        req.headers.get("referer") ||
        null,
      user_agent:
        (typeof body?.user_agent === "string" && body.user_agent) ||
        req.headers.get("user-agent") ||
        null,
      country: req.headers.get("x-vercel-ip-country") || null,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logRouteError("api_track_failed", error);
    return NextResponse.json({ error: "Tracking failed" }, { status: 500 });
  }
}
