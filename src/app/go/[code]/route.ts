import { NextRequest, NextResponse } from "next/server";
import { recordGrowthSignal } from "@/lib/growth";
import { appendAttributionParams, resolveShortCode } from "@/lib/links";
import { getClientIp, getVisitorHash } from "@/lib/request";
import { getSupabaseAdminClient } from "@/lib/supabase";

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  const supabase = getSupabaseAdminClient();
  const trackedLink = await resolveShortCode(params.code, supabase);

  if (!trackedLink) {
    return new NextResponse("Not found", { status: 404 });
  }

  const visitorHash = getVisitorHash(getClientIp(req));

  await supabase.from("link_clicks").insert({
    tracked_link_id: trackedLink.id,
    site_id: trackedLink.site_id,
    visitor_hash: visitorHash,
    referrer: req.headers.get("referer") || null,
    user_agent: req.headers.get("user-agent") || null,
    country: req.headers.get("x-vercel-ip-country") || null,
  });

  await supabase
    .from("tracked_links")
    .update({ click_count: trackedLink.click_count + 1 })
    .eq("id", trackedLink.id);

  await recordGrowthSignal(
    {
      siteId: trackedLink.site_id,
      contentItemId: trackedLink.content_item_id,
      experimentId: trackedLink.experiment_id,
      channel: trackedLink.channel,
      signalType: "traffic",
      metricName: "link_click",
      metricValue: 1,
      source: "tracked_link",
      metadata: {
        tracked_link_id: trackedLink.id,
        short_code: trackedLink.short_code,
      },
    },
    supabase
  );

  const destination = appendAttributionParams(trackedLink.destination_url, trackedLink);
  return NextResponse.redirect(destination, { status: 307 });
}
