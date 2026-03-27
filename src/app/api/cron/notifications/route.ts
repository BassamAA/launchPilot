import { NextRequest, NextResponse } from "next/server";
import { logRouteError, logStructured } from "@/lib/observability";
import { sendWeeklyDigestEmail, sendPerformanceReportEmail } from "@/lib/notifications";
import { getSupabaseAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  let emailsSent = 0;
  let errors = 0;

  try {
    // Fetch all active sites with their users and recent stats
    const { data: sites } = await supabase
      .from("sites")
      .select("id, name, onboarding_json")
      .eq("status", "active")
      .eq("brief_confirmed", true)
      .neq("is_system_site", true);

    if (!sites || sites.length === 0) {
      return NextResponse.json({ message: "No sites to notify", emailsSent: 0 });
    }

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    for (const site of sites) {
      // Check if notifications are disabled for this site
      const onboarding = site.onboarding_json as { notifications_enabled?: boolean } | null;
      if (onboarding?.notifications_enabled === false) continue;

      try {
        // Get the user who owns this site (via company)
        const { data: siteRow } = await supabase
          .from("sites")
          .select("company_id")
          .eq("id", site.id)
          .single();

        if (!siteRow?.company_id) continue;

        const { data: member } = await supabase
          .from("company_members")
          .select("user_id")
          .eq("company_id", siteRow.company_id)
          .limit(1)
          .maybeSingle();

        if (!member?.user_id) continue;

        const { data: { user } } = await supabase.auth.admin.getUserById(member.user_id);
        const email = user?.email;
        if (!email) continue;

        // Pending approval count
        const { count: pendingApproval } = await supabase
          .from("content_items")
          .select("id", { count: "exact", head: true })
          .eq("site_id", site.id)
          .eq("status", "draft")
          .neq("body", "");

        // Published this week
        const { count: publishedThisWeek } = await supabase
          .from("content_items")
          .select("id", { count: "exact", head: true })
          .eq("site_id", site.id)
          .eq("status", "published")
          .gte("updated_at", oneWeekAgo);

        // Clicks this week
        const { count: clicksThisWeek } = await supabase
          .from("link_clicks")
          .select("id", { count: "exact", head: true })
          .eq("site_id", site.id)
          .gte("clicked_at", oneWeekAgo);

        // Clicks last week (for trend)
        const { count: clicksLastWeek } = await supabase
          .from("link_clicks")
          .select("id", { count: "exact", head: true })
          .eq("site_id", site.id)
          .gte("clicked_at", twoWeeksAgo)
          .lt("clicked_at", oneWeekAgo);

        // Signups this week
        const { count: signupsThisWeek } = await supabase
          .from("conversions")
          .select("id", { count: "exact", head: true })
          .eq("site_id", site.id)
          .gte("occurred_at", oneWeekAgo);

        const thisWeekClicks = clicksThisWeek || 0;
        const lastWeekClicks = clicksLastWeek || 0;
        const weekOverWeekChange =
          lastWeekClicks > 0
            ? Math.round(((thisWeekClicks - lastWeekClicks) / lastWeekClicks) * 100)
            : null;

        // Send digest (includes pending approval + performance summary)
        if ((pendingApproval || 0) > 0 || (publishedThisWeek || 0) > 0) {
          await sendWeeklyDigestEmail({
            to: email,
            siteName: site.name,
            siteId: site.id,
            pendingApproval: pendingApproval || 0,
            published: publishedThisWeek || 0,
            clicks: thisWeekClicks,
            signups: signupsThisWeek || 0,
          });
          emailsSent++;
        }

        // Send performance report only if there's meaningful activity
        if (thisWeekClicks >= 5 || (signupsThisWeek || 0) >= 1) {
          await sendPerformanceReportEmail({
            to: email,
            siteName: site.name,
            siteId: site.id,
            clicks: thisWeekClicks,
            signups: signupsThisWeek || 0,
            weekOverWeekClicksChange: weekOverWeekChange,
          });
          emailsSent++;
        }
      } catch (siteError) {
        errors++;
        logStructured("error", "notification_site_failed", {
          site_id: site.id,
          error: String(siteError),
        });
      }
    }

    logStructured("info", "notifications_cron_complete", { emailsSent, errors, sites: sites.length });
    return NextResponse.json({ emailsSent, errors, sites: sites.length });
  } catch (error) {
    logRouteError("api_cron_notifications_failed", error);
    return NextResponse.json({ error: "Notifications cron failed" }, { status: 500 });
  }
}
