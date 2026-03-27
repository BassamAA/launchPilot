import { NextRequest, NextResponse } from "next/server";
import { logRouteError, logStructured } from "@/lib/observability";
import { processConversionSignal } from "@/lib/signals/conversions";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp, getVisitorHash, parseJsonBody } from "@/lib/request";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { conversionTrackSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const rate = checkRateLimit(`conversions:${clientIp}`, 40, 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const parsed = conversionTrackSchema.safeParse(await parseJsonBody(req));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid conversion payload", issues: parsed.error.flatten() }, { status: 400 });
    }
    const body = parsed.data;
    const trackingKey = body.public_tracking_key;
    const eventType = body.event_type || "signup";

    const supabase = getSupabaseAdminClient();
    const { data: site } = await supabase
      .from("sites")
      .select("id")
      .eq("public_tracking_key", trackingKey)
      .maybeSingle();

    if (!site) {
      return NextResponse.json({ error: "Invalid tracking key" }, { status: 404 });
    }

    const trackedCode = body?.lp_tid as string | undefined;
    const { data: trackedLink } = trackedCode
      ? await supabase
          .from("tracked_links")
          .select("*")
          .eq("short_code", trackedCode)
          .maybeSingle()
      : { data: null };

    const visitorHash = getVisitorHash(clientIp);
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    let existingQuery = supabase
      .from("conversions")
      .select("id")
      .eq("site_id", site.id)
      .eq("visitor_hash", visitorHash)
      .eq("event_type", eventType)
      .gte("converted_at", todayStart.toISOString())
      .limit(1);

    existingQuery = trackedLink?.id
      ? existingQuery.eq("tracked_link_id", trackedLink.id)
      : existingQuery.is("tracked_link_id", null);

    const { data: existing } = await existingQuery.maybeSingle();

    if (existing) {
      return NextResponse.json({ ok: true, deduped: true });
    }

    const conversionPayload = {
      site_id: site.id,
      tracked_link_id: trackedLink?.id || null,
      content_item_id: trackedLink?.content_item_id || null,
      experiment_id: trackedLink?.experiment_id || null,
      channel: trackedLink?.channel || (body?.utm_medium as string | undefined) || null,
      event_type: eventType,
      visitor_hash: visitorHash,
      utm_source: (body?.utm_source as string | undefined) || trackedLink?.utm_source || null,
      utm_medium: (body?.utm_medium as string | undefined) || trackedLink?.utm_medium || null,
      utm_campaign: (body?.utm_campaign as string | undefined) || trackedLink?.utm_campaign || null,
      utm_content: (body?.utm_content as string | undefined) || trackedLink?.utm_content || null,
      referrer:
        (typeof body?.referrer === "string" && body.referrer) ||
        req.headers.get("referer") ||
        null,
      metadata_json: {
        page_url: body?.page_url || null,
        country: req.headers.get("x-vercel-ip-country") || null,
        ...(body?.metadata || {}),
      },
    };

    const { data: conversion } = await supabase
      .from("conversions")
      .insert(conversionPayload)
      .select("id")
      .single();

    await processConversionSignal(
      {
        siteId: site.id,
        trackedLinkId: trackedLink?.id || null,
        contentItemId: trackedLink?.content_item_id || null,
        experimentId: trackedLink?.experiment_id || null,
        channel: (trackedLink?.channel as
          | "blog"
          | "twitter"
          | "reddit"
          | "email"
          | "tiktok"
          | "directory"
          | null) || null,
        eventType,
        metadata: { conversion_id: conversion?.id || null },
      },
      supabase
    );

    logStructured("info", "conversion_tracked", {
      site_id: site.id,
      event_type: eventType,
      tracked_link_id: trackedLink?.id || null,
      channel: trackedLink?.channel || null,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logRouteError("api_conversions_track_failed", error);
    return NextResponse.json({ error: "Conversion tracking failed" }, { status: 500 });
  }
}
