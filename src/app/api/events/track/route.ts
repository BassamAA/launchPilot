import { NextRequest, NextResponse } from "next/server";
import { logRouteError, logStructured } from "@/lib/observability";
import { processProductEvent, resolveSurfaceTypeForChannel } from "@/lib/product-events";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp, getVisitorHash, parseJsonBody } from "@/lib/request";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { productEventTrackSchema } from "@/lib/validation";
import { ContentChannel, ProductEventType } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const rate = checkRateLimit(`events:${clientIp}`, 60, 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const parsed = productEventTrackSchema.safeParse(await parseJsonBody(req));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid event payload", issues: parsed.error.flatten() }, { status: 400 });
    }

    const body = parsed.data;
    const supabase = getSupabaseAdminClient();
    const { data: site } = await supabase
      .from("sites")
      .select("id")
      .eq("public_tracking_key", body.public_tracking_key)
      .maybeSingle();

    if (!site) {
      return NextResponse.json({ error: "Invalid tracking key" }, { status: 404 });
    }

    const trackedLink = body.lp_tid
      ? await supabase
          .from("tracked_links")
          .select("*")
          .eq("short_code", body.lp_tid)
          .maybeSingle()
          .then(({ data }) => data)
      : null;

    const visitorHash = getVisitorHash(clientIp);
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    let existingQuery = supabase
      .from("product_events")
      .select("id")
      .eq("site_id", site.id)
      .eq("visitor_hash", visitorHash)
      .eq("event_type", body.event_type)
      .gte("occurred_at", todayStart.toISOString())
      .limit(1);

    existingQuery = trackedLink?.id
      ? existingQuery.eq("tracked_link_id", trackedLink.id)
      : existingQuery.is("tracked_link_id", null);

    const { data: existing } = await existingQuery.maybeSingle();

    if (existing) {
      return NextResponse.json({ ok: true, deduped: true });
    }

    const channel =
      ((trackedLink?.channel as ContentChannel | undefined) ||
        (body.utm_medium as ContentChannel | undefined) ||
        null);
    const surfaceType = await resolveSurfaceTypeForChannel(site.id, channel, supabase);

    await processProductEvent(
      {
        siteId: site.id,
        trackedLinkId: trackedLink?.id || null,
        contentItemId: trackedLink?.content_item_id || null,
        experimentId: trackedLink?.experiment_id || null,
        surfaceType,
        channel,
        eventType: body.event_type as ProductEventType,
        eventValue: body.value ?? (body.event_type === "subscribed" ? 1 : 1),
        currency: body.currency || null,
        visitorHash,
        utmSource: body.utm_source || trackedLink?.utm_source || null,
        utmMedium: body.utm_medium || trackedLink?.utm_medium || null,
        utmCampaign: body.utm_campaign || trackedLink?.utm_campaign || null,
        utmContent: body.utm_content || trackedLink?.utm_content || null,
        referrer: body.referrer || req.headers.get("referer") || null,
        metadata: {
          page_url: body.page_url || null,
          country: req.headers.get("x-vercel-ip-country") || null,
          ...(body.metadata || {}),
        },
      },
      supabase
    );

    logStructured("info", "product_event_recorded", {
      site_id: site.id,
      event_type: body.event_type,
      channel,
      surface_type: surfaceType,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logRouteError("api_events_track_failed", error);
    return NextResponse.json({ error: "Event tracking failed" }, { status: 500 });
  }
}
