import { NextRequest, NextResponse } from "next/server";
import { analyzeContentPatterns } from "@/lib/content-patterns";
import { reprioritizeGrowthExperiments } from "@/lib/growth";
import { logRouteError, logStructured } from "@/lib/observability";
import { recordBlogViewSignals } from "@/lib/performance";
import { fetchTwitterSignals } from "@/lib/signals/twitter";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { getFunnelIntelligence } from "@/lib/funnel";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();

  const [{ data: twitterConnections }, { data: blogItems }] = await Promise.all([
    supabase
      .from("platform_connections")
      .select("site_id")
      .eq("platform", "twitter"),
    supabase
      .from("content_items")
      .select("site_id")
      .eq("channel", "blog")
      .eq("status", "published"),
  ]);

  const siteIds = Array.from(
    new Set([
      ...(twitterConnections || []).map((row) => row.site_id),
      ...(blogItems || []).map((row) => row.site_id),
    ])
  );

  if (siteIds.length === 0) {
    return NextResponse.json({ message: "No sites with fetchable signals" });
  }

  const details: Array<Record<string, unknown>> = [];
  let autoReprioritized = 0;

  for (const siteId of siteIds) {
    try {
      const hasTwitter = (twitterConnections || []).some((row) => row.site_id === siteId);
      const twitterResult = hasTwitter
        ? await fetchTwitterSignals(siteId, supabase)
        : { tweetsChecked: 0, snapshotsStored: 0, newSignals: 0 };
      const blogResult = await recordBlogViewSignals(siteId, supabase);

      const newSignals = twitterResult.newSignals + blogResult.newSignals;
      const patternSnapshot = newSignals > 0 ? await analyzeContentPatterns(siteId, supabase) : null;
      if (newSignals > 0) {
        await getFunnelIntelligence(siteId, supabase);
      }

      await supabase.from("activity_log").insert({
        site_id: siteId,
        action: "signals_fetched",
        description: `Fetched Twitter performance for ${twitterResult.tweetsChecked} tweets and aggregated blog signals for ${blogResult.trackedPosts} posts`,
        metadata_json: {
          twitter: twitterResult,
          blog: blogResult,
          new_signals: newSignals,
          pattern_snapshot_sample_size: patternSnapshot?.sample_size || 0,
        },
      });

      if (newSignals > 5) {
        await reprioritizeGrowthExperiments(siteId, supabase);
        autoReprioritized += 1;

        await supabase.from("activity_log").insert({
          site_id: siteId,
          action: "growth_auto_reprioritized",
          description: `Auto-reprioritized growth bets based on ${newSignals} new signals`,
          metadata_json: { new_signals: newSignals },
        });
      }

      details.push({
        site_id: siteId,
        twitter: twitterResult,
        blog: blogResult,
        new_signals: newSignals,
        pattern_snapshot_sample_size: patternSnapshot?.sample_size || 0,
        auto_reprioritized: newSignals > 5,
      });
      logStructured("info", "site_signals_fetched", {
        site_id: siteId,
        new_signals: newSignals,
        auto_reprioritized: newSignals > 5,
      });
    } catch (error) {
      await supabase.from("activity_log").insert({
        site_id: siteId,
        action: "signal_fetch_failed",
        description: "Signal ingestion failed for this site",
        metadata_json: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });

      logRouteError("site_signal_fetch_failed", error, { site_id: siteId });
      details.push({
        site_id: siteId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({
    processed_sites: siteIds.length,
    auto_reprioritized: autoReprioritized,
    details,
  });
}
