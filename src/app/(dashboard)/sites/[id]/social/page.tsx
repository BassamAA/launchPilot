import { notFound, redirect } from "next/navigation";
import { GenerateStrategyButton } from "@/components/social/GenerateStrategyButton";
import { SocialCalendar, ScheduledContentItem } from "@/components/social/SocialCalendar";
import {
  InstagramStrategy,
  LinkedInStrategy,
  TwitterStrategy,
} from "@/lib/generators/instagram";
import { normalizeSocialStrategyState } from "@/lib/social-strategy";
import { getSupabaseServerClient, getUser } from "@/lib/supabase";
import { SocialStrategyState } from "@/types";

const PLATFORMS = [
  { key: "twitter" as const, label: "Twitter / X" },
  { key: "instagram" as const, label: "Instagram" },
  { key: "linkedin" as const, label: "LinkedIn" },
  { key: "youtube" as const, label: "YouTube" },
];

export default async function SocialStrategyPage({ params }: { params: { id: string } }) {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = getSupabaseServerClient();
  const [{ data: site }, { data: contentItems }] = await Promise.all([
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
      .neq("channel", "blog")
      .gte("scheduled_date", new Date().toISOString().split("T")[0])
      .order("scheduled_date", { ascending: true })
      .limit(90),
  ]);

  if (!site) notFound();

  const strategies = normalizeSocialStrategyState(
    site.social_strategy_json as SocialStrategyState | Record<string, unknown> | null | undefined
  );

  const hasAnyStrategy = Object.keys(strategies).length > 0;
  const missingPlatforms = PLATFORMS.filter((p) => !strategies[p.key]);

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Posting Calendar</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          What to post, where, and when — organized by platform
        </p>
      </div>

      {/* No brief yet */}
      {!site.brief_json && (
        <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center">
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Set up your profile first</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            We need to understand your business before building your calendar.
          </p>
          <a
            href={`/sites/${params.id}/brief`}
            className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
          >
            Set up profile →
          </a>
        </div>
      )}

      {/* Calendar — grouped by platform */}
      {(hasAnyStrategy || (contentItems && contentItems.length > 0)) && (
        <SocialCalendar
          strategies={strategies}
          contentItems={(contentItems ?? []) as ScheduledContentItem[]}
          siteId={params.id}
        />
      )}

      {/* Generate missing platforms */}
      {site.brief_json && missingPlatforms.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            {hasAnyStrategy ? "Add more platforms" : "Generate your calendar"}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
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
        </div>
      )}
    </div>
  );
}
