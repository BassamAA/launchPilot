import { generateAndSaveContentItem } from "@/lib/generators/content";
import { publishContentItem } from "@/lib/publishing";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { logStructured } from "@/lib/observability";

type SupabaseAdmin = ReturnType<typeof getSupabaseAdminClient>;

/**
 * Run the autopilot cycle for a single site:
 * 1. Generate content bodies for any ungenerated draft items due today
 * 2. Auto-approve and publish draft items with bodies (blog + twitter)
 */
async function runSiteAutopilotCycle(siteId: string, supabase: SupabaseAdmin) {
  const today = new Date().toISOString().split("T")[0];

  // Step 1: generate bodies for ungenerated items due today
  const { data: ungenerated } = await supabase
    .from("content_items")
    .select("id")
    .eq("site_id", siteId)
    .eq("status", "draft")
    .eq("body", "")
    .in("channel", ["blog", "twitter"])
    .or(`scheduled_date.is.null,scheduled_date.lte.${today}`)
    .limit(5);

  let generated = 0;
  for (const item of ungenerated || []) {
    const result = await generateAndSaveContentItem(item.id, supabase);
    if (result.success) generated++;
    await new Promise((r) => setTimeout(r, 400));
  }

  // Step 2: auto-approve + publish drafts with body
  const { data: readyDrafts } = await supabase
    .from("content_items")
    .select("id, channel")
    .eq("site_id", siteId)
    .eq("status", "draft")
    .neq("body", "")
    .in("channel", ["blog", "twitter"])
    .or(`scheduled_date.is.null,scheduled_date.lte.${today}`)
    .order("scheduled_date", { ascending: true })
    .limit(10);

  let published = 0;
  let scheduled = 0;
  let failed = 0;

  for (const item of readyDrafts || []) {
    const result = await publishContentItem(item.id, "auto_approve", supabase);
    if (result.status === "published") published++;
    else if (result.status === "scheduled") scheduled++;
    else if (!result.success) failed++;
  }

  return { generated, published, scheduled, failed };
}

/**
 * Run the autopilot cycle for all sites with autopilot_enabled = true.
 * Called by the /api/cron/autopilot endpoint.
 */
export async function runAutopilotCycle(supabase = getSupabaseAdminClient()) {
  const { data: sites } = await supabase
    .from("sites")
    .select("id, name")
    .eq("autopilot_enabled", true)
    .eq("status", "active");

  if (!sites || sites.length === 0) {
    return { sites_processed: 0 };
  }

  let totalGenerated = 0;
  let totalPublished = 0;
  let totalScheduled = 0;
  let totalFailed = 0;

  for (const site of sites) {
    try {
      const result = await runSiteAutopilotCycle(site.id, supabase);
      totalGenerated += result.generated;
      totalPublished += result.published;
      totalScheduled += result.scheduled;
      totalFailed += result.failed;

      if (result.generated > 0 || result.published > 0) {
        logStructured("info", "autopilot_site_cycle", {
          siteId: site.id,
          siteName: site.name,
          ...result,
        });
      }
    } catch (err) {
      logStructured("error", "autopilot_site_cycle_failed", {
        siteId: site.id,
        error: String(err),
      });
    }
  }

  return {
    sites_processed: sites.length,
    generated: totalGenerated,
    published: totalPublished,
    scheduled: totalScheduled,
    failed: totalFailed,
  };
}
