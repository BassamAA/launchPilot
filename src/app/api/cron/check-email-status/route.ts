import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";

function mapResendStatus(status: string | null | undefined) {
  switch ((status || "").toLowerCase()) {
    case "queued":
    case "scheduled":
      return "queued";
    case "sent":
    case "processed":
      return "sent";
    case "delivered":
      return "delivered";
    case "opened":
      return "opened";
    case "clicked":
      return "clicked";
    case "bounced":
    case "complained":
      return "bounced";
    default:
      return null;
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  const { data: sends } = await supabase
    .from("email_sends")
    .select("id, status, sent_at, delivered_at, opened_at, clicked_at, resend_message_id, metadata_json")
    .in("status", ["queued", "sent", "delivered"])
    .limit(50);

  if (!sends || sends.length === 0) {
    return NextResponse.json({ message: "No email sends to check" });
  }

  let updated = 0;
  let failed = 0;

  for (const send of sends) {
    const resendId =
      send.resend_message_id ||
      ((send.metadata_json as Record<string, unknown> | null)?.resend_id as string | undefined);
    if (!resendId || typeof resendId !== "string") continue;

    try {
      const res = await fetch(`https://api.resend.com/emails/${resendId}`, {
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
      });

      if (!res.ok) {
        failed++;
        continue;
      }

      const data = await res.json();
      const mappedStatus =
        mapResendStatus((data.last_event as string | undefined) || (data.status as string | undefined));

      if (!mappedStatus || mappedStatus === send.status) continue;

      const now = new Date().toISOString();
      await supabase
        .from("email_sends")
        .update({
          status: mappedStatus,
          delivered_at: mappedStatus === "delivered" ? now : send.delivered_at,
          opened_at: mappedStatus === "opened" ? now : send.opened_at,
          clicked_at: mappedStatus === "clicked" ? now : send.clicked_at,
          metadata_json: {
            ...(send.metadata_json || {}),
            resend_status: data.status || null,
            resend_last_event: data.last_event || null,
          },
          updated_at: now,
        })
        .eq("id", send.id);

      updated++;
    } catch {
      failed++;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return NextResponse.json({ updated, failed, total: sends.length });
}
