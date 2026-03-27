"use client";

import { Badge, Card } from "@/components/ui";
import { CopyableTextBlock } from "@/components/social/CopyableTextBlock";
import { InstagramStrategy } from "@/lib/generators/instagram";

interface InstagramStrategyViewProps {
  strategy: InstagramStrategy;
}

function formatBadgeClass(format: "reel" | "carousel" | "static" | "story") {
  if (format === "reel") return "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200";
  if (format === "carousel") return "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200";
  if (format === "story") return "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200";
  return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200";
}

export function InstagramStrategyView({ strategy }: InstagramStrategyViewProps) {
  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Account Positioning
          </p>
          <p className="mt-2 text-sm leading-7 text-gray-700 dark:text-gray-200">
            {strategy.account_positioning}
          </p>
        </div>
        <div className="rounded-xl border border-brand-100 dark:border-brand-800 bg-brand-50/70 dark:bg-brand-900/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
            Unique Angle
          </p>
          <p className="mt-2 text-sm leading-7 text-brand-900 dark:text-brand-100">{strategy.unique_angle}</p>
        </div>
      </Card>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Content Pillars</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Five repeatable lanes to anchor the account.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {strategy.content_pillars.map((pillar) => (
            <Card key={pillar.name} className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{pillar.name}</h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{pillar.description}</p>
                </div>
                <Badge variant="purple">{pillar.frequency_pct}%</Badge>
              </div>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
                {pillar.post_ideas.map((idea) => (
                  <li key={idea} className="rounded-lg bg-gray-50 dark:bg-gray-900 px-3 py-2">
                    {idea}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Format Mix</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{strategy.format_mix.reasoning}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl bg-brand-50 dark:bg-brand-900/20 p-4">
              <p className="text-xs uppercase tracking-wide text-brand-700 dark:text-brand-300">Reels</p>
              <p className="mt-2 text-2xl font-bold text-brand-900 dark:text-brand-100">{strategy.format_mix.reels_pct}%</p>
            </div>
            <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-4">
              <p className="text-xs uppercase tracking-wide text-blue-700 dark:text-blue-300">Carousels</p>
              <p className="mt-2 text-2xl font-bold text-blue-900 dark:text-blue-100">{strategy.format_mix.carousels_pct}%</p>
            </div>
            <div className="rounded-xl bg-gray-100 dark:bg-gray-700 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-700 dark:text-gray-300">Static</p>
              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{strategy.format_mix.static_posts_pct}%</p>
            </div>
            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 p-4">
              <p className="text-xs uppercase tracking-wide text-amber-700 dark:text-amber-300">Stories / week</p>
              <p className="mt-2 text-2xl font-bold text-amber-900 dark:text-amber-100">{strategy.format_mix.stories_per_week}</p>
            </div>
          </div>
        </Card>

        <Card className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Profile Optimization</h2>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Bio Draft</p>
            <div className="mt-2">
              <CopyableTextBlock value={strategy.profile_optimization.bio_draft} rows={4} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Highlight Categories</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {strategy.profile_optimization.highlight_categories.map((item) => (
                  <Badge key={item} variant="info">{item}</Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Username</p>
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">
                {strategy.profile_optimization.username_suggestion || "Current username is fine"}
              </p>
            </div>
          </div>
          <div className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
            <p><span className="font-semibold">Link strategy:</span> {strategy.profile_optimization.link_in_bio_strategy}</p>
            <p><span className="font-semibold">Profile photo direction:</span> {strategy.profile_optimization.profile_photo_direction}</p>
          </div>
        </Card>
      </div>

      <Card className="space-y-4 overflow-hidden">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">30-Day Calendar</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Daily execution prompts for the next month.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 text-left text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">
                <th className="px-3 py-3">Day</th>
                <th className="px-3 py-3">Format</th>
                <th className="px-3 py-3">Pillar</th>
                <th className="px-3 py-3">Concept</th>
                <th className="px-3 py-3">Caption Preview</th>
              </tr>
            </thead>
            <tbody>
              {strategy.thirty_day_calendar.map((item) => (
                <tr key={`${item.day}-${item.concept}`} className="border-b border-gray-100 dark:border-gray-800 align-top">
                  <td className="px-3 py-3 font-semibold text-gray-900 dark:text-white">{item.day}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${formatBadgeClass(item.format)}`}>
                      {item.format}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-700 dark:text-gray-200">{item.pillar}</td>
                  <td className="px-3 py-3 text-gray-700 dark:text-gray-200">{item.concept}</td>
                  <td className="px-3 py-3 text-gray-500 dark:text-gray-400">{item.caption_draft}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Collaboration Targets</h2>
        <div className="grid gap-4 xl:grid-cols-2">
          {strategy.collaborators.map((collaborator) => (
            <Card key={`${collaborator.account_archetype}-${collaborator.collaboration_type}`} className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{collaborator.account_archetype}</h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{collaborator.audience_fit}</p>
                </div>
                <Badge variant="info">{collaborator.collaboration_type.replace(/_/g, " ")}</Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 text-sm text-gray-700 dark:text-gray-200">
                <p><span className="font-semibold">Audience size:</span> {collaborator.estimated_follower_range}</p>
                <p><span className="font-semibold">Examples:</span> {collaborator.example_accounts?.join(", ") || "Use niche account research"}</p>
              </div>
              <CopyableTextBlock value={collaborator.outreach_dm} rows={8} />
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Hashtag Clusters</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {strategy.hashtag_clusters.map((cluster) => (
            <Card key={cluster.cluster_name} className="space-y-3">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{cluster.cluster_name}</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{cluster.use_case}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {cluster.tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => navigator.clipboard.writeText(tag)}
                    className="rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-200 hover:border-brand-300 hover:text-brand-700"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Reel Concepts</h2>
          <div className="space-y-4">
            {strategy.reel_concepts.map((concept) => (
              <Card key={concept.hook} className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{concept.hook}</h3>
                  <Badge variant="purple">{concept.suggested_audio_type.replace(/_/g, " ")}</Badge>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-200"><span className="font-semibold">Opening visual:</span> {concept.opening_visual}</p>
                <ol className="space-y-2 text-sm text-gray-700 dark:text-gray-200 list-decimal pl-5">
                  {concept.structure.map((step) => <li key={step}>{step}</li>)}
                </ol>
                <div className="rounded-xl bg-gray-50 dark:bg-gray-900 p-4 text-sm text-gray-700 dark:text-gray-200">
                  <p><span className="font-semibold">Caption hook:</span> {concept.caption_hook}</p>
                  <p className="mt-2"><span className="font-semibold">CTA:</span> {concept.cta}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Carousel Concepts</h2>
          <div className="space-y-4">
            {strategy.carousel_concepts.map((concept) => (
              <Card key={concept.title_slide} className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Title Slide</p>
                  <h3 className="mt-2 font-semibold text-gray-900 dark:text-white">{concept.title_slide}</h3>
                </div>
                <ol className="space-y-2 text-sm text-gray-700 dark:text-gray-200 list-decimal pl-5">
                  {concept.slides.map((slide) => <li key={slide}>{slide}</li>)}
                </ol>
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-sm text-gray-700 dark:text-gray-200">
                  <p><span className="font-semibold">Final slide CTA:</span> {concept.final_slide_cta}</p>
                  <p className="mt-2"><span className="font-semibold">Caption:</span> {concept.caption}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>
      </div>

      <Card className="border-red-100 dark:border-red-900 bg-red-50/70 dark:bg-red-900/10">
        <h2 className="text-lg font-semibold text-red-900 dark:text-red-100">What Not To Do</h2>
        <ul className="mt-4 space-y-2 text-sm text-red-800 dark:text-red-200">
          {strategy.what_not_to_do.map((item) => (
            <li key={item} className="rounded-lg bg-white/80 dark:bg-red-950/40 px-4 py-3">
              {item}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
