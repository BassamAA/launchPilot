"use client";

import { Badge, Card } from "@/components/ui";
import { CopyableTextBlock } from "@/components/social/CopyableTextBlock";
import { YouTubeStrategy } from "@/lib/generators/instagram";

interface YouTubeStrategyViewProps {
  strategy: YouTubeStrategy;
}

export function YouTubeStrategyView({ strategy }: YouTubeStrategyViewProps) {
  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Channel Positioning</h2>
        <p className="mt-3 text-sm leading-7 text-gray-700 dark:text-gray-200">{strategy.channel_positioning}</p>
      </Card>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Content Series</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {strategy.content_series.map((series) => (
            <Card key={series.name} className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{series.name}</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{series.format}</p>
                </div>
                <Badge variant="purple">{series.cadence}</Badge>
              </div>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
                {series.episode_ideas.map((idea) => (
                  <li key={idea} className="rounded-lg bg-gray-50 dark:bg-gray-900 px-3 py-2">{idea}</li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Video Ideas</h2>
        <div className="grid gap-4 xl:grid-cols-2">
          {strategy.video_ideas.map((video) => (
            <Card key={video.title} className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{video.title}</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Target keyword: {video.target_keyword}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 text-sm text-gray-700 dark:text-gray-200">
                <p><span className="font-semibold">Thumbnail:</span> {video.thumbnail_concept}</p>
                <p><span className="font-semibold">Hook:</span> {video.hook_line}</p>
              </div>
              <ol className="space-y-2 text-sm text-gray-700 dark:text-gray-200 list-decimal pl-5">
                {video.outline.map((step) => <li key={step}>{step}</li>)}
              </ol>
              <div className="rounded-xl bg-gray-50 dark:bg-gray-900 p-4 text-sm text-gray-700 dark:text-gray-200">
                <span className="font-semibold">CTA:</span> {video.cta}
              </div>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">SEO Keywords</h2>
          <div className="flex flex-wrap gap-2">
            {strategy.seo_keywords.map((keyword) => (
              <Badge key={keyword} variant="info">{keyword}</Badge>
            ))}
          </div>
        </Card>

        <Card className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Growth Tactics</h2>
          <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
            {strategy.channel_growth_tactics.map((tactic) => (
              <li key={tactic} className="rounded-lg bg-gray-50 dark:bg-gray-900 px-4 py-3">{tactic}</li>
            ))}
          </ul>
        </Card>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Collaborators</h2>
        <div className="grid gap-4 xl:grid-cols-2">
          {strategy.collaborators.map((collaborator) => (
            <Card key={`${collaborator.archetype}-${collaborator.collab_format}`} className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{collaborator.archetype}</h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{collaborator.audience_fit}</p>
                </div>
                <Badge variant="info">{collaborator.collab_format}</Badge>
              </div>
              <CopyableTextBlock value={collaborator.outreach_message} rows={7} />
            </Card>
          ))}
        </div>
      </section>

      <Card className="border-red-100 dark:border-red-900 bg-red-50/70 dark:bg-red-900/10">
        <h2 className="text-lg font-semibold text-red-900 dark:text-red-100">What Not To Do</h2>
        <ul className="mt-4 space-y-2 text-sm text-red-800 dark:text-red-200">
          {strategy.what_not_to_do.map((item) => (
            <li key={item} className="rounded-lg bg-white/80 dark:bg-red-950/40 px-4 py-3">{item}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
