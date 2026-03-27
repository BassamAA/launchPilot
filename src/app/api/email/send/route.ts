import { NextRequest, NextResponse } from "next/server";
import { BRAND_NAME, BRAND_OUTREACH_EMAIL } from "@/lib/brand";
import { recordGrowthSignal } from "@/lib/growth";
import { getAuthorizedContentItem, getSupabaseAdminClient, getSupabaseServerClient, getUser } from "@/lib/supabase";

interface Recipient {
  email: string;
  name?: string;
  company?: string;
}

async function sendViaResend(
  from: string,
  to: string,
  toName: string | undefined,
  subject: string,
  html: string,
  replyTo?: string
): Promise<{ id?: string; error?: string }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: toName ? `${toName} <${to}>` : to,
      subject,
      html,
      reply_to: replyTo,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return { error: err };
  }

  const data = await res.json();
  return { id: data.id };
}

function personalizeBody(body: string, recipient: Recipient): string {
  return body
    .replace(/\{\{name\}\}/gi, recipient.name || "there")
    .replace(/\{\{company\}\}/gi, recipient.company || "your company")
    .replace(/\{\{email\}\}/gi, recipient.email)
    .replace(/\{\{first_name\}\}/gi, recipient.name?.split(" ")[0] || "there");
}

// POST /api/email/send
// Body: { content_item_id, recipients: [{email, name}], campaign_name, test_only?: boolean }
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content_item_id, recipients, campaign_name, test_only } = await req.json();

  if (!content_item_id || !recipients?.length || !campaign_name) {
    return NextResponse.json(
      { error: "content_item_id, recipients, and campaign_name are required" },
      { status: 400 }
    );
  }

  const authorizedItem = await getAuthorizedContentItem(content_item_id);
  if (!authorizedItem) {
    return NextResponse.json({ error: "Content item not found" }, { status: 404 });
  }

  const supabase = getSupabaseAdminClient();
  const serverSupabase = getSupabaseServerClient();

  const { data: item } = await supabase
    .from("content_items")
    .select("id, site_id, body, title, metadata_json")
    .eq("id", content_item_id)
    .single();

  if (!item) return NextResponse.json({ error: "Content item not found" }, { status: 404 });

  const { data: emailConnection } = await serverSupabase
    .from("platform_connections")
    .select("metadata_json")
    .eq("site_id", item.site_id)
    .eq("platform", "email")
    .single();

  const subject = (item.metadata_json as Record<string, string>)?.subject_line || item.title;
  const baseBody = item.body;
  const emailSettings = (emailConnection?.metadata_json || {}) as Record<string, string | boolean>;
  const fromName = String(emailSettings.from_name || BRAND_NAME);
  const fromEmail = emailSettings.mode === "custom"
    ? String(emailSettings.from_email || process.env.RESEND_FROM_EMAIL || BRAND_OUTREACH_EMAIL)
    : String(process.env.RESEND_FROM_EMAIL || BRAND_OUTREACH_EMAIL);
  const from = `${fromName} <${fromEmail}>`;

  let sent = 0;
  let failed = 0;
  const testList: Recipient[] = test_only ? [recipients[0]] : recipients;

  for (const recipient of testList) {
    const personalizedBody = personalizeBody(baseBody, recipient);
    const htmlBody = personalizedBody
      .replace(/\n\n/g, "</p><p>")
      .replace(/\n/g, "<br>")
      .replace(/^/, "<p>")
      .replace(/$/, "</p>");

    const result = await sendViaResend(
      from,
      recipient.email,
      recipient.name,
      personalizeBody(subject, recipient),
      htmlBody
    );

    const record = {
      site_id: item.site_id,
      content_item_id: item.id,
      recipient_email: recipient.email,
      recipient_name: recipient.name || null,
      recipient_company: recipient.company || null,
      resend_message_id: result.id || null,
      status: result.id ? "sent" : "failed",
      sent_at: result.id ? new Date().toISOString() : null,
      metadata_json: {
        campaign_name,
        subject: personalizeBody(subject, recipient),
        body: personalizedBody,
        resend_id: result.id || null,
        error: result.error || null,
        test_only: !!test_only,
      },
    };

    await supabase.from("email_sends").insert(record);

    await recordGrowthSignal(
      {
        siteId: item.site_id,
        contentItemId: item.id,
        channel: "email",
        signalType: result.id ? "email_sent" : "email_failed",
        metricName: result.id ? "email_sent" : "email_failed",
        metricValue: 1,
        metadata: {
          campaign_name,
          recipient_email: recipient.email,
          test_only: !!test_only,
          resend_id: result.id || null,
        },
      },
      supabase
    );

    if (result.id) {
      sent++;
    } else {
      failed++;
    }

    // Rate limit: 2 emails/sec
    await new Promise((r) => setTimeout(r, 500));
  }

  if (sent > 0 && !test_only) {
    await supabase
      .from("content_items")
      .update({
        status: "published",
        published_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    await supabase.from("activity_log").insert({
      site_id: item.site_id,
      action: "email_campaign_sent",
      description: `Email campaign sent: ${campaign_name} (${sent} sent${failed ? `, ${failed} failed` : ""})`,
      metadata_json: { content_item_id: item.id, sent, failed, campaign_name },
    });

    await recordGrowthSignal(
      {
        siteId: item.site_id,
        contentItemId: item.id,
        channel: "email",
        signalType: "published",
        metricName: "email_campaign_sent",
        metricValue: sent,
        metadata: { campaign_name, failed, test_only: false },
      },
      supabase
    );
  }

  return NextResponse.json({ sent, failed, total: testList.length, test_only: !!test_only });
}
