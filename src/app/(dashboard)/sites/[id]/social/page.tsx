import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui";
import { GenerateStrategyButton } from "@/components/social/GenerateStrategyButton";
import { InstagramStrategyView } from "@/components/social/InstagramStrategyView";
import { LinkedInStrategyView } from "@/components/social/LinkedInStrategyView";
import { TwitterStrategyView } from "@/components/social/TwitterStrategyView";
import { YouTubeStrategyView } from "@/components/social/YouTubeStrategyView";
import { SocialCalendar, ScheduledContentItem } from "@/components/social/SocialCalendar";
import { StrategyAccordion } from "@/components/social/StrategyAccordion";
import { ProfileAudit } from "@/components/social/ProfileAudit";
import { AngleGaps } from "@/components/social/AngleGaps";
import {
  InstagramStrategy,
  LinkedInStrategy,
  TwitterStrategy,
  YouTubeStrategy,
} from "@/lib/generators/instagram";
import { normalizeSocialStrategyState } from "@/lib/social-strategy";
import { getSupabaseServerClient, getUser } from "@/lib/supabase";
import { SocialStrategyState } from "@/types";

const PLATFORMS = [
  { key: "instagram" as const, label: "Instagram" },
  { key: "twitter" as const, label: "Twitter / X" },
  { key: "linkedin" as const, label: "LinkedIn" },
  { key: "youtube" as const, label: "YouTube" },
];

export default async function SocialStrategyPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = getSupabaseServerClient();
  const [{ data: site }, { data: contentItems }, { data: connections }] = await Promise.all([
    supabase
      .from("sites")
      .select("id, name, brief_json, social_strategy_json")
      .eq("id", params.id)
      .single(),
    supabase
      .from("content_items")
      .select("id, channel, title, body, status, scheduled_date")
      .eq("site_id", params.id)
      .not("scheduled_date", "is", null)
      .order("scheduled_date", { ascending: true })
      .limit(60),
    supabase
      .from("platform_connections")
      .select("platform")
      .eq("site_id", params.id),
  ]);

  const connectedPlatforms = (connections ?? []).map((c: { platform: string }) => c.platform);

  if (!site) notFound();

  const strategies = normalizeSocialStrategyState(
    site.social_strategy_json as SocialStrategyState | Record<string, unknown> | null | undefined
  );

  const hasAnyStrategy = Object.keys(strategies).length > 0;
  const missingPlatforms = PLATFORMS.filter((p) => !strategies[p.key]);
  const readyPlatforms = PLATFORMS.filter((p) => !!strategies[p.key]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Posting Calendar</h1>
            <Badge variant="purple">{site.name}</Badge>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Exactly what to post, where, and when — every day.
          </p>
        </div>
      </div>

      {/* No brief yet */}
      {!site.brief_json && (
        <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center">
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Confirm your brief first</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Social strategy requires an approved marketing brief.
          </p>
          <a
            href={`/sites/${params.id}/brief`}
            className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
          >
            Review Brief
          </a>
        </div>
      )}

      {/* Profile audit + angle gaps — only if brief exists */}
      {site.brief_json && (
        <>
          <ProfileAudit siteId={params.id} />
          <AngleGaps siteId={params.id} />
        </>
      )}

      {/* Calendar */}
      {(hasAnyStrategy || (contentItems && contentItems.length > 0)) && (
        <section>
          <SocialCalendar
            strategies={strategies}
            contentItems={(contentItems ?? []) as ScheduledContentItem[]}
            siteId={params.id}
            connectedPlatforms={connectedPlatforms}
          />
        </section>
      )}

      {/* Generate missing platforms */}
      {site.brief_json && (
        <section className="space-y-3">
          {missingPlatforms.length > 0 && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                {hasAnyStrategy ? "Add more platforms" : "Generate your posting calendar"}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {missingPlatforms.map((p) => (
                  <div
                    key={p.key}
                    className="flex items-center justify-between gap-4 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 px-4 py-3"
                  >
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{p.label}</p>
                    <GenerateStrategyButton siteId={params.id} platform={p.key} hasExisting={false} />
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* Full strategy details — collapsed */}
      {readyPlatforms.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Full Strategy Details
          </p>
          <div className="space-y-2">
            {readyPlatforms.map((p) => (
              <StrategyAccordion key={p.key} title={`${p.label} — positioning, pillars, hashtags & more`}>
                <div className="flex justify-end mb-4">
                  <GenerateStrategyButton siteId={params.id} platform={p.key} hasExisting />
                </div>
                {p.key === "instagram" && strategies.instagram && (
                  <InstagramStrategyView
                    strategy={strategies.instagram.strategy_json as InstagramStrategy}
                    siteId={params.id}
                  />
                )}
                {p.key === "twitter" && strategies.twitter && (
                  <TwitterStrategyView strategy={strategies.twitter.strategy_json as TwitterStrategy} />
                )}
                {p.key === "linkedin" && strategies.linkedin && (
                  <LinkedInStrategyView strategy={strategies.linkedin.strategy_json as LinkedInStrategy} />
                )}
                {p.key === "youtube" && strategies.youtube && (
                  <YouTubeStrategyView strategy={strategies.youtube.strategy_json as YouTubeStrategy} />
                )}
              </StrategyAccordion>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
