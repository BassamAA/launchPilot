import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export async function GET(
  req: NextRequest,
  { params }: { params: { trackingKey: string } }
) {
  if (!params?.trackingKey) {
    return new NextResponse("console.warn('BreakthroughPilot pixel: missing tracking key');", {
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
      },
    });
  }

  const supabase = getSupabaseAdminClient();
  const { data: site } = await supabase
    .from("sites")
    .select("id")
    .eq("public_tracking_key", params.trackingKey)
    .maybeSingle();

  if (!site) {
    return new NextResponse("console.warn('BreakthroughPilot pixel: invalid tracking key');", {
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
      },
    });
  }

  const script = `(function () {
  var STORAGE_KEY = "launchpilot_attribution";
  var CONVERSION_API_URL = ${JSON.stringify(`${getAppUrl()}/api/conversions/track`)};
  var EVENT_API_URL = ${JSON.stringify(`${getAppUrl()}/api/events/track`)};
  var TRACKING_KEY = ${JSON.stringify(params.trackingKey)};

  function readStored() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (error) {
      return {};
    }
  }

  function writeStored(value) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch (error) {}
  }

  function captureFromUrl() {
    try {
      var params = new URLSearchParams(window.location.search);
      var next = readStored();
      var changed = false;
      ["lp_tid", "utm_source", "utm_medium", "utm_campaign", "utm_content"].forEach(function (key) {
        var value = params.get(key);
        if (value) {
          next[key] = value;
          changed = true;
        }
      });
      if (changed) {
        next.last_seen_at = new Date().toISOString();
        writeStored(next);
      }
    } catch (error) {}
  }

  function buildPayload(eventType, metadata, value, currency) {
    var attribution = readStored();
    if (!attribution.lp_tid && !attribution.utm_source) return;

    return JSON.stringify({
      public_tracking_key: TRACKING_KEY,
      event_type: eventType || "signup",
      lp_tid: attribution.lp_tid || null,
      utm_source: attribution.utm_source || null,
      utm_medium: attribution.utm_medium || null,
      utm_campaign: attribution.utm_campaign || null,
      utm_content: attribution.utm_content || null,
      page_url: window.location.href,
      referrer: document.referrer || "",
      value: typeof value === "number" ? value : null,
      currency: currency || null,
      metadata: metadata || {},
    });
  }

  function send(url, eventType, metadata, value, currency) {
    var payload = buildPayload(eventType, metadata, value, currency);
    if (!payload) return;

    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([payload], { type: "application/json" }));
      return;
    }

    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(function () {});
  }

  captureFromUrl();

  window.launchpilot = window.launchpilot || {};
  window.launchpilot.trackConversion = function (options) {
    var eventType = options && options.event ? options.event : "signup";
    send(CONVERSION_API_URL, eventType, options || {}, options && typeof options.value === "number" ? options.value : null, options && options.currency ? options.currency : null);
  };

  window.launchpilot.trackEvent = function (options) {
    var eventType = options && options.event ? options.event : "activated";
    send(EVENT_API_URL, eventType, options || {}, options && typeof options.value === "number" ? options.value : null, options && options.currency ? options.currency : null);
  };

  function autoTrack() {
    var el = document.querySelector("[data-launchpilot-conversion]");
    if (!el) return;
    var eventType = el.getAttribute("data-launchpilot-conversion") || "signup";
    send(CONVERSION_API_URL, eventType, { auto: true }, null, null);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoTrack);
  } else {
    autoTrack();
  }
})();`;

  return new NextResponse(script, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
