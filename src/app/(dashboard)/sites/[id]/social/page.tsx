import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge, Button, Card } from "@/components/ui";
import { GenerateStrategyButton } from "@/components/social/GenerateStrategyButton";
import { InstagramStrategyView } from "@/components/social/InstagramStrategyView";
import { LinkedInStrategyView } from "@/components/social/LinkedInStrategyView";
import { YouTubeStrategyView } from "@/components/social/YouTubeStrategyView";
import {
  InstagramStrategy,
  LinkedInStrategy,
  YouTubeStrategy,
} from "@/lib/generators/instagram";
import {
  SOCIAL_STRATEGY_PLATFORMS,
  SocialStrategyPlatform,
  normalizeSocialStrategyState,
} from "@/lib/social-strategy";
import { getSupabaseServerClient, getUser } from "@/lib/supabase";
import { SocialStrategyState } from "@/types";

const TAB_LABELS: Record<SocialStrategyPlatform, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  linkedin: "LinkedIn",
};

export default async function SocialStrategyPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: string };
}) {
  const user = await getUser();
  if (!user) redirect("/login");

  const requestedTab = searchParams.tab;
  const activeTab = (SOCIAL_STRATEGY_PLATFORMS.includes(requestedTab as SocialStrategyPlatform)
    ? requestedTab
    : "instagram") as SocialStrategyPlatform;

  const supabase = getSupabaseServerClient();
  const { data: site } = await supabase
    .from("sites")
    .select("id, name, brief_json, social_strategy_json")
    .eq("id", params.id)
    .single();

  if (!site) notFound();

  const strategies = normalizeSocialStrategyState(
    site.social_strategy_json as SocialStrategyState | Record<string, unknown> | null | undefined
  );
  const activeEntry = strategies[activeTab];

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Social Strategy</h1>
            <Badge variant="purple">{site.name}</Badge>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Platform-specific playbooks, collaboration targets, and content plans.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {SOCIAL_STRATEGY_PLATFORMS.map((tab) => (
          <Link
            key={tab}
            href={`/sites/${params.id}/social?tab=${tab}`}
            className={
              tab === activeTab
                ? "inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-brand transition-all duration-150 hover:bg-brand-600"
                : "inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 transition-all duration-150 hover:bg-gray-50 dark:hover:bg-gray-700"
            }
          >
            {TAB_LABELS[tab]}
          </Link>
        ))}
      </div>

      {!site.brief_json ? (
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Confirm your brief first</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Social strategy depends on the confirmed business brief. Review the brief, then come back here to generate playbooks.
          </p>
          <div>
            <Link
              href={`/sites/${params.id}/brief`}
              className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-brand transition-all duration-150 hover:bg-brand-600"
            >
              Open Brief
            </Link>
          </div>
        </Card>
      ) : activeEntry ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{TAB_LABELS[activeTab]} Playbook</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Generated {new Date(activeEntry.generated_at).toLocaleString()}
              </p>
            </div>
            <GenerateStrategyButton siteId={params.id} platform={activeTab} hasExisting />
          </div>

          {activeTab === "instagram" && (
            <InstagramStrategyView strategy={activeEntry.strategy_json as InstagramStrategy} />
          )}
          {activeTab === "youtube" && (
            <YouTubeStrategyView strategy={activeEntry.strategy_json as YouTubeStrategy} />
          )}
          {activeTab === "linkedin" && (
            <LinkedInStrategyView strategy={activeEntry.strategy_json as LinkedInStrategy} />
          )}
        </div>
      ) : (
        <Card className="py-14 text-center">
          <div className="mx-auto max-w-xl space-y-4">
            <Badge variant="info">{TAB_LABELS[activeTab]}</Badge>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Generate your {TAB_LABELS[activeTab]} strategy
            </h2>
            <p className="text-sm leading-7 text-gray-600 dark:text-gray-300">
              Create a platform-specific playbook with positioning, content pillars, collaboration targets, and a concrete publishing plan.
            </p>
            <div className="flex justify-center pt-2">
              <GenerateStrategyButton siteId={params.id} platform={activeTab} hasExisting={false} />
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
