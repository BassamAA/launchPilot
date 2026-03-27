"use client";

import { Badge, Card } from "@/components/ui";
import { CopyableTextBlock } from "@/components/social/CopyableTextBlock";
import { LinkedInStrategy } from "@/lib/generators/instagram";

interface LinkedInStrategyViewProps {
  strategy: LinkedInStrategy;
}

const formatVariantMap: Record<
  LinkedInStrategy["post_ideas"][number]["format"],
  "purple" | "info" | "warning" | "default"
> = {
  story: "purple",
  list: "info",
  hot_take: "warning",
  behind_scenes: "default",
  lesson: "purple",
  data: "info",
};

export function LinkedInStrategyView({ strategy }: LinkedInStrategyViewProps) {
  return (
    <div className="space-y-6">
      <Card className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Profile Optimization</h2>
          <p className="mt-3 text-sm text-gray-700 dark:text-gray-200">
            <span className="font-semibold">Headline:</span> {strategy.profile_optimization.headline}
          </p>
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">About Section</p>
            <div className="mt-2">
              <CopyableTextBlock value={strategy.profile_optimization.about_section} rows={10} />
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Featured Section Strategy</p>
            <p className="mt-3 text-sm leading-7 text-gray-700 dark:text-gray-200">
              {strategy.profile_optimization.featured_section_strategy}
            </p>
          </div>
        </div>
      </Card>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Content Pillars</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {strategy.content_pillars.map((pillar) => (
            <Card key={pillar.name} className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{pillar.name}</h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{pillar.why_it_works}</p>
              </div>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
                {pillar.post_ideas.map((idea) => (
                  <li key={idea} className="rounded-lg bg-gray-50 dark:bg-gray-900 px-3 py-2">{idea}</li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Post Ideas</h2>
        <div className="grid gap-4 xl:grid-cols-2">
          {strategy.post_ideas.map((post) => (
            <Card key={`${post.hook}-${post.cta}`} className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{post.hook}</h3>
                <Badge variant={formatVariantMap[post.format] || "default"}>{post.format.replace(/_/g, " ")}</Badge>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-200">{post.body_outline}</p>
              <div className="rounded-xl bg-gray-50 dark:bg-gray-900 p-4 text-sm text-gray-700 dark:text-gray-200">
                <span className="font-semibold">CTA:</span> {post.cta}
              </div>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Commenting Strategy</h2>
          <p className="mt-3 text-sm leading-7 text-gray-700 dark:text-gray-200">{strategy.commenting_strategy}</p>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Connection Strategy</h2>
          <p className="mt-3 text-sm leading-7 text-gray-700 dark:text-gray-200">{strategy.connection_strategy}</p>
        </Card>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Collaborators</h2>
        <div className="grid gap-4 xl:grid-cols-2">
          {strategy.collaborators.map((collaborator) => (
            <Card key={`${collaborator.archetype}-${collaborator.collab_opportunity}`} className="space-y-3">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{collaborator.archetype}</h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{collaborator.how_to_engage}</p>
              </div>
              <div className="rounded-xl bg-gray-50 dark:bg-gray-900 p-4 text-sm text-gray-700 dark:text-gray-200">
                <span className="font-semibold">Collab opportunity:</span> {collaborator.collab_opportunity}
              </div>
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
