import { NextRequest, NextResponse } from "next/server";
import { recordGrowthSignal } from "@/lib/growth";
import { logRouteError, logStructured } from "@/lib/observability";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyResendWebhookSignature } from "@/lib/resend-webhook";
import { resolveExperimentIdForContent } from "@/lib/performance";
import { getSupabaseAdminClient } from "@/lib/supabase";

function mapWebhookEvent(type: string | null | undefined) {
  switch ((type || "").toLowerCase()) {
    case "email.delivered":
      return { status: "delivered", metricName: "email_delivered", timestampField: "delivered_at" as const };
    case "email.opened":
      return { status: "opened", metricName: "email_opened", timestampField: "opened_at" as const };
    case "email.clicked":
      return { status: "clicked", metricName: "email_clicked", timestampField: "clicked_at" as const };
    case "email.bounced":
      return { status: "bounced", metricName: "email_bounced", timestampField: null };
    default:
      return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const rate = checkRateLimit(`resend:${req.headers.get("svix-id") || req.headers.get("x-forwarded-for") || "unknown"}`, 120, 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const rawBody = await req.text();
    const verification = verifyResendWebhookSignature(rawBody, req.headers);
    if (!verification.ok) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    const type = payload?.type as string | undefined;
    const mapped = mapWebhookEvent(type);

    if (!mapped) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const eventData = (payload?.data || {}) as Record<string, unknown>;
    const resendMessageId =
      (typeof eventData.email_id === "string" && eventData.email_id) ||
      (typeof eventData.id === "string" && eventData.id) ||
      (typeof payload?.created?.email_id === "string" && payload.created.email_id) ||
      null;

    if (!resendMessageId) {
      return NextResponse.json({ error: "Missing resend message id" }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const { data: emailSend } = await supabase
      .from("email_sends")
      .select("id, site_id, content_item_id, status, delivered_at, opened_at, clicked_at, metadata_json")
      .eq("resend_message_id", resendMessageId)
      .maybeSingle();

    if (!emailSend) {
      return NextResponse.json({ ok: true, ignored: true, reason: "email_send_not_found" });
    }

    const occurredAt =
      (typeof eventData.created_at === "string" && eventData.created_at) ||
      (typeof payload?.created_at === "string" && payload.created_at) ||
      new Date().toISOString();

    const nextStatus = mapped.status;
    const nextUpdate: Record<string, unknown> = {
      status: nextStatus,
      metadata_json: {
        ...(emailSend.metadata_json || {}),
        last_webhook_type: type,
        last_webhook_payload: payload,
      },
      updated_at: new Date().toISOString(),
    };

    if (mapped.timestampField) {
      nextUpdate[mapped.timestampField] = emailSend[mapped.timestampField] || occurredAt;
    }

    await supabase.from("email_sends").update(nextUpdate).eq("id", emailSend.id);

    const experimentId = await resolveExperimentIdForContent(
      emailSend.site_id,
      "email",
      emailSend.content_item_id,
      supabase
    );

    await recordGrowthSignal(
      {
        siteId: emailSend.site_id,
        contentItemId: emailSend.content_item_id,
        experimentId,
        channel: "email",
        signalType: "performance",
        metricName: mapped.metricName,
        metricValue: 1,
        source: "resend_webhook",
        metadata: {
          resend_message_id: resendMessageId,
          event_type: type,
          occurred_at: occurredAt,
        },
      },
      supabase
    );

    logStructured("info", "resend_webhook_processed", {
      event_type: type,
      resend_message_id: resendMessageId,
      site_id: emailSend.site_id,
      content_item_id: emailSend.content_item_id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logRouteError("api_resend_webhook_failed", error);
    return NextResponse.json({ error: "Webhook handling failed" }, { status: 500 });
  }
}
