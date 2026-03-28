"use client";

import { Badge, Card } from "@/components/ui";
import { CopyableTextBlock } from "@/components/social/CopyableTextBlock";
import { TwitterStrategy } from "@/lib/generators/instagram";

interface TwitterStrategyViewProps {
  strategy: TwitterStrategy;
}

const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_FULL_MAP: Record<string, string> = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
  Saturday: "Sat",
  Sunday: "Sun",
};

function tweetTypeBadgeClass(type: "tweet" | "thread" | "reply_bait" | "poll") {
  if (type === "thread") return "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200";
  if (type === "reply_bait") return "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200";
  if (type === "poll") return "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200";
  return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200";
}

function PostingScheduleGrid({ schedule }: { schedule: TwitterStrategy["posting_schedule"] }) {
  // Build a map: day short label -> times[]
  const scheduleMap: Record<string, string[]> = {};
  for (const entry of schedule.best_times) {
    const short = DAY_FULL_MAP[entry.day] ?? entry.day.slice(0, 3);
    scheduleMap[short] = entry.times;
  }

  // Collect all unique time slots across all days
  const allTimes = Array.from(
    new Set(schedule.best_times.flatMap((e) => e.times))
  ).sort();

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-700">
            <th className="px-3 py-2 text-left text-gray-400 dark:text-gray-500 font-medium">Day</th>
            {allTimes.map((time) => (
              <th key={time} className="px-3 py-2 text-left text-gray-400 dark:text-gray-500 font-medium whitespace-nowrap">
                {time}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAYS_SHORT.map((day) => {
            const dayTimes = scheduleMap[day] ?? [];
            const isActive = schedule.best_days.some(
              (d) => DAY_FULL_MAP[d] === day || d.slice(0, 3) === day
            );
            return (
              <tr
                key={day}
                className={`border-b border-gray-50 dark:border-gray-800 ${isActive ? "" : "opacity-40"}`}
              >
                <td className="px-3 py-2 font-semibold text-gray-700 dark:text-gray-300 w-12">{day}</td>
                {allTimes.map((time) => (
                  <td key={time} className="px-3 py-2">
                    {dayTimes.includes(time) ? (
                      <span className="inline-block h-3 w-3 rounded-full bg-brand-500" />
                    ) : (
                      <span className="inline-block h-3 w-3 rounded-full bg-gray-100 dark:bg-gray-800" />
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function TwitterStrategyView({ strategy }: TwitterStrategyViewProps) {
  return (
    <div className="space-y-6">
      {/* Positioning */}
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

      {/* Content Pillars */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Content Pillars</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Repeatable lanes that anchor the account.</p>
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
                {pillar.tweet_ideas.map((idea) => (
                  <li key={idea} className="rounded-lg bg-gray-50 dark:bg-gray-900 px-3 py-2">
                    {idea}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      {/* Posting Schedule */}
      <Card className="space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Posting Schedule</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{strategy.posting_schedule.reasoning}</p>
          </div>
          <div className="flex items-center gap-4 flex-wrap text-sm text-gray-700 dark:text-gray-200">
            <span>
              <span className="font-semibold text-gray-900 dark:text-white">{strategy.posting_schedule.tweets_per_day}</span> tweets/day
            </span>
            <div className="flex flex-wrap gap-1">
              {strategy.posting_schedule.best_days.map((day) => (
                <Badge key={day} variant="info">{day}</Badge>
              ))}
            </div>
          </div>
        </div>
        <PostingScheduleGrid schedule={strategy.posting_schedule} />
      </Card>

      {/* Thread Concepts */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Thread Concepts</h2>
        <div className="grid gap-4 xl:grid-cols-2">
          {strategy.thread_concepts.map((thread) => (
            <Card key={thread.hook} className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Hook Tweet</p>
                <p className="mt-2 font-semibold text-gray-900 dark:text-white leading-snug">{thread.hook}</p>
              </div>
              <ol className="space-y-2 text-sm text-gray-700 dark:text-gray-200 list-decimal pl-5">
                {thread.outline.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
              <div className="rounded-xl bg-gray-50 dark:bg-gray-900 px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                <span className="font-semibold">CTA:</span> {thread.cta}
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Accounts to Engage */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Accounts to Engage</h2>
        <div className="grid gap-4 xl:grid-cols-2">
          {strategy.accounts_to_engage.map((account) => (
            <Card key={account.archetype} className="space-y-3">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{account.archetype}</h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{account.why}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {account.example_accounts.map((handle) => (
                  <span
                    key={handle}
                    className="rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-200"
                  >
                    {handle}
                  </span>
                ))}
              </div>
              <div className="rounded-xl bg-gray-50 dark:bg-gray-900 px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                <span className="font-semibold">Approach:</span> {account.engagement_approach}
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Engagement Tactics */}
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Engagement Tactics</h2>
        <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
          {strategy.engagement_tactics.map((tactic) => (
            <li key={tactic} className="rounded-lg bg-gray-50 dark:bg-gray-900 px-4 py-3">
              {tactic}
            </li>
          ))}
        </ul>
      </Card>

      {/* 30-Day Calendar */}
      <Card className="space-y-4 overflow-hidden">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">30-Day Calendar</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Daily execution plan with draft tweets ready to post.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 text-left text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">
                <th className="px-3 py-3">Day</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Pillar</th>
                <th className="px-3 py-3">Draft Tweet</th>
                <th className="px-3 py-3 whitespace-nowrap">Best Time</th>
              </tr>
            </thead>
            <tbody>
              {strategy.thirty_day_calendar.map((item) => (
                <tr key={`${item.day}-${item.concept}`} className="border-b border-gray-100 dark:border-gray-800 align-top">
                  <td className="px-3 py-3 font-semibold text-gray-900 dark:text-white">{item.day}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tweetTypeBadgeClass(item.type)}`}>
                      {item.type.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-700 dark:text-gray-200 whitespace-nowrap">{item.pillar}</td>
                  <td className="px-3 py-3 text-gray-700 dark:text-gray-200 max-w-xs">
                    <CopyableTextBlock value={item.draft} rows={3} />
                  </td>
                  <td className="px-3 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{item.best_time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Growth Milestones */}
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Growth Milestones</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {strategy.growth_milestones.map((milestone) => (
            <div
              key={milestone.followers}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4"
            >
              <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">
                {milestone.followers.toLocaleString()}
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">followers</p>
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">{milestone.unlock}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* What Not To Do */}
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
