import { Resend } from "resend";
import { logStructured } from "@/lib/observability";
import { BRAND_MARKETING_URL, BRAND_NAME, BRAND_NAME_UPPER, BRAND_NOTIFICATIONS_EMAIL } from "@/lib/brand";

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || `${BRAND_NAME} <${BRAND_NOTIFICATIONS_EMAIL}>`;
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || BRAND_MARKETING_URL).replace(/\/$/, "");

interface NotificationEmail {
  to: string;
  subject: string;
  html: string;
}

function button(text: string, href: string) {
  return `<a href="${href}" style="display:inline-block;padding:10px 20px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">${text}</a>`;
}

function emailShell(body: string) {
  return `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;padding:32px 16px;margin:0;">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;padding:32px;">
<p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#6366f1;letter-spacing:0.05em;">${BRAND_NAME_UPPER}</p>
${body}
<p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">You're receiving this because you have a ${BRAND_NAME} site. <a href="${APP_URL}/settings" style="color:#6366f1;">Manage notifications</a></p>
</div></body></html>`;
}

async function send(email: NotificationEmail) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email.to,
      subject: email.subject,
      html: email.html,
    });
  } catch (err) {
    logStructured("error", "notification_send_failed", { to: email.to, subject: email.subject, error: String(err) });
    throw err;
  }
}

export async function sendPlanReadyEmail(opts: {
  to: string;
  siteName: string;
  siteId: string;
  itemCount: number;
}) {
  await send({
    to: opts.to,
    subject: `Your ${opts.siteName} marketing plan is ready`,
    html: emailShell(`
<h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#111827;">Your 30-day plan is ready</h2>
<p style="margin:0 0 16px;font-size:15px;color:#374151;">${BRAND_NAME} generated ${opts.itemCount} content pieces for <strong>${opts.siteName}</strong>. They're in your queue waiting for approval — review, edit, and approve to start publishing.</p>
${button("Go to approval queue →", `${APP_URL}/sites/${opts.siteId}/queue`)}
<p style="margin:20px 0 0;font-size:13px;color:#6b7280;">Takes about 5 minutes to approve your first batch.</p>`),
  });
}

export async function sendWeeklyDigestEmail(opts: {
  to: string;
  siteName: string;
  siteId: string;
  pendingApproval: number;
  published: number;
  clicks: number;
  signups: number;
}) {
  if (opts.pendingApproval === 0 && opts.published === 0) return;

  const subject =
    opts.pendingApproval > 0
      ? `${opts.pendingApproval} content pieces waiting for approval — ${opts.siteName}`
      : `Your ${opts.siteName} weekly summary`;

  await send({
    to: opts.to,
    subject,
    html: emailShell(`
<h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#111827;">Weekly summary for ${opts.siteName}</h2>
${opts.pendingApproval > 0 ? `<p style="margin:0 0 16px;font-size:15px;color:#374151;"><strong>${opts.pendingApproval} content piece${opts.pendingApproval === 1 ? "" : "s"}</strong> ${opts.pendingApproval === 1 ? "is" : "are"} ready for your review. Approve them to keep your marketing moving.</p>` : ""}
<table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
  ${opts.published > 0 ? `<tr><td style="padding:8px 0;font-size:14px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Published this week</td><td style="padding:8px 0;font-size:14px;font-weight:600;color:#111827;text-align:right;border-bottom:1px solid #f3f4f6;">${opts.published}</td></tr>` : ""}
  ${opts.clicks > 0 ? `<tr><td style="padding:8px 0;font-size:14px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Clicks tracked</td><td style="padding:8px 0;font-size:14px;font-weight:600;color:#111827;text-align:right;border-bottom:1px solid #f3f4f6;">${opts.clicks}</td></tr>` : ""}
  ${opts.signups > 0 ? `<tr><td style="padding:8px 0;font-size:14px;color:#6b7280;">Signups attributed</td><td style="padding:8px 0;font-size:14px;font-weight:600;color:#111827;text-align:right;">${opts.signups}</td></tr>` : ""}
</table>
${button(opts.pendingApproval > 0 ? "Review queue →" : "View dashboard →", opts.pendingApproval > 0 ? `${APP_URL}/sites/${opts.siteId}/queue` : `${APP_URL}/sites/${opts.siteId}`)}`),
  });
}

export async function sendPerformanceReportEmail(opts: {
  to: string;
  siteName: string;
  siteId: string;
  clicks: number;
  signups: number;
  weekOverWeekClicksChange: number | null;
}) {
  if (opts.clicks === 0 && opts.signups === 0) return;

  const trend =
    opts.weekOverWeekClicksChange !== null && Math.abs(opts.weekOverWeekClicksChange) >= 5
      ? opts.weekOverWeekClicksChange > 0
        ? ` ↑ ${opts.weekOverWeekClicksChange}% from last week`
        : ` ↓ ${Math.abs(opts.weekOverWeekClicksChange)}% from last week`
      : "";

  await send({
    to: opts.to,
    subject: `${opts.siteName}: ${opts.clicks} click${opts.clicks === 1 ? "" : "s"} this week`,
    html: emailShell(`
<h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#111827;">This week's performance</h2>
<p style="margin:0 0 20px;font-size:15px;color:#374151;">${opts.siteName} drove <strong>${opts.clicks} click${opts.clicks === 1 ? "" : "s"}${trend}</strong>${opts.signups > 0 ? ` and <strong>${opts.signups} signup${opts.signups === 1 ? "" : "s"}</strong>` : ""} this week.</p>
${button("See full report →", `${APP_URL}/sites/${opts.siteId}/performance`)}`),
  });
}

export async function sendPatternInsightEmail(opts: {
  to: string;
  siteName: string;
  siteId: string;
  insight: string;
}) {
  await send({
    to: opts.to,
    subject: `${BRAND_NAME} learned something about ${opts.siteName}`,
    html: emailShell(`
<h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#111827;">New content insight</h2>
<p style="margin:0 0 16px;font-size:15px;color:#374151;">After analyzing your published content, ${BRAND_NAME} found a pattern that's worth knowing:</p>
<blockquote style="margin:0 0 20px;padding:12px 16px;background:#f3f4f6;border-left:3px solid #6366f1;border-radius:0 8px 8px 0;font-size:15px;color:#111827;">${opts.insight}</blockquote>
<p style="margin:0 0 20px;font-size:14px;color:#6b7280;">New content for ${opts.siteName} has been adjusted to reflect this.</p>
${button("See what changed →", `${APP_URL}/sites/${opts.siteId}/performance`)}`),
  });
}
