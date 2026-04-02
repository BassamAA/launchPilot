"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button, Badge, Card, Spinner, EmptyState, cn } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { ContentItem, MarketingPlan, ContentStatus, GrowthExperiment, GrowthSignal } from "@/types";
import { BRAND_NAME } from "@/lib/brand";
import {
  CalendarIcon,
  ListBulletIcon,
  BoltIcon,
  ClockIcon,
  XMarkIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon } from "@heroicons/react/24/solid";

type ViewMode = "list" | "calendar";

const CHANNEL_DOT: Record<string, string> = {
  blog: "bg-emerald-400",
  twitter: "bg-sky-400",
  reddit: "bg-orange-400",
  email: "bg-violet-400",
  tiktok: "bg-pink-400",
  directory: "bg-indigo-400",
  linkedin: "bg-blue-400",
};

const CHANNEL_BADGE: Record<string, string> = {
  blog: "bg-emerald-50 text-emerald-700",
  twitter: "bg-sky-50 text-sky-700",
  reddit: "bg-orange-50 text-orange-700",
  email: "bg-violet-50 text-violet-700",
  tiktok: "bg-pink-50 text-pink-700",
  directory: "bg-indigo-50 text-indigo-700",
  linkedin: "bg-blue-50 text-blue-700",
};

const STATUS_CONFIG: Record<ContentStatus, { icon: React.ReactNode; label: string; class: string }> = {
  draft: {
    icon: <ClockIcon className="w-3.5 h-3.5" />,
    label: "Pending",
    class: "text-amber-600 bg-amber-50",
  },
  approved: {
    icon: <CheckCircleIcon className="w-3.5 h-3.5" />,
    label: "Approved",
    class: "text-emerald-600 bg-emerald-50",
  },
  published: {
    icon: <CheckCircleIcon className="w-3.5 h-3.5" />,
    label: "Published",
    class: "text-emerald-700 bg-emerald-100",
  },
  rejected: {
    icon: <XMarkIcon className="w-3.5 h-3.5" />,
    label: "Rejected",
    class: "text-red-600 bg-red-50",
  },
  failed: {
    icon: <XMarkIcon className="w-3.5 h-3.5" />,
    label: "Failed",
    class: "text-red-600 bg-red-50",
  },
};

export default function PlanPage() {
  const params = useParams();
  const siteId = params.id as string;
  const { toast } = useToast();

  const [view, setView] = useState<ViewMode>("list");
  const [plan, setPlan] = useState<MarketingPlan | null>(null);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [generating, setGenerating] = useState(false);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [growthLoading, setGrowthLoading] = useState(true);
  const [reprioritizing, setReprioritizing] = useState(false);
  const [experiments, setExperiments] = useState<GrowthExperiment[]>([]);
  const [recentSignals, setRecentSignals] = useState<GrowthSignal[]>([]);
  const [growthSummary, setGrowthSummary] = useState<{
    published: number;
    failed: number;
    approved: number;
    emailsSent: number;
    topChannels: Array<{ channel: string; count: number }>;
  } | null>(null);

  const fetchPlan = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sites/${siteId}/plan`);
      if (res.ok) {
        const data = await res.json();
        setPlan(data.plan);
        setItems(data.items || []);
      }
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  const fetchGrowth = useCallback(async () => {
    setGrowthLoading(true);
    try {
      const res = await fetch(`/api/sites/${siteId}/growth`);
      if (res.ok) {
        const data = await res.json();
        setExperiments(data.experiments || []);
        setRecentSignals(data.recentSignals || []);
        setGrowthSummary(data.signalSummary || null);
      }
    } finally {
      setGrowthLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);
  useEffect(() => {
    fetchGrowth();
  }, [fetchGrowth]);

  async function handleGeneratePlan() {
    setGenerating(true);
    try {
      const res = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_id: siteId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast(`Plan created with ${data.item_count} action items`, "success");
        await fetchPlan();
      } else if (res.status === 409) {
        toast("A plan already exists for this month", "info");
        await fetchPlan();
      } else {
        toast(data.error || "Failed to generate plan", "error");
      }
    } finally {
      setGenerating(false);
    }
  }

  async function handleBulkGenerate() {
    if (!plan) return;
    const needsContent = items.filter((i) => !i.body);
    if (needsContent.length === 0) {
      toast("All content is already generated.", "info");
      return;
    }

    setBulkGenerating(true);
    setBulkProgress({ done: 0, total: needsContent.length });

    try {
      const res = await fetch("/api/bulk-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: plan.id }),
      });
      const data = await res.json();
      if (res.ok) {
        toast(`Generated ${data.generated} pieces${data.failed > 0 ? ` (${data.failed} failed)` : ""}`, "success");
        await fetchPlan();
      } else {
        toast(data.error || "Bulk generation failed", "error");
      }
    } finally {
      setBulkGenerating(false);
      setBulkProgress(null);
    }
  }

  async function handleReprioritize() {
    setReprioritizing(true);
    try {
      const res = await fetch(`/api/sites/${siteId}/growth`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setExperiments(data.experiments || []);
        setRecentSignals(data.recentSignals || []);
        setGrowthSummary(data.signalSummary || null);
        toast(data.summary || "Growth bets reprioritized", "success");
      } else {
        toast(data.error || "Failed to reprioritize growth bets", "error");
      }
    } finally {
      setReprioritizing(false);
    }
  }

  const byWeek: Record<number, ContentItem[]> = {};
  items.forEach((item) => {
    const week = (item.metadata_json as { week?: number })?.week || 1;
    if (!byWeek[week]) byWeek[week] = [];
    byWeek[week].push(item);
  });

  const weekThemes = plan?.strategy_json?.weeks || [];
  const hasRenderablePlan = !!plan?.strategy_json && items.length > 0;
  const strategy = plan?.strategy_json;
  const strategicBets = strategy?.strategic_bets || [];
  const risks = strategy?.risks || [];
  const growthLoops = strategy?.growth_loops || [];
  const channelTheses = strategy?.channel_theses || [];

  const withContent = items.filter((i) => i.body).length;
  const noContent = items.filter((i) => !i.body).length;
  const approved = items.filter((i) => ["approved", "published"].includes(i.status)).length;
  const published = items.filter((i) => i.status === "published").length;
  const nextAction =
    noContent > 0
      ? `Generate the ${noContent} remaining draft${noContent === 1 ? "" : "s"} so the queue has something to ship.`
      : approved > published
      ? `You already have ${approved - published} approved item${approved - published === 1 ? "" : "s"}. Move to Queue and publish them.`
      : items.length > 0
      ? "Open Queue and start reviewing what should ship first."
      : "Generate or rebuild the plan to create your first execution items.";

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (!hasRenderablePlan) {
    return (
      <div className="max-w-lg mx-auto">
        <EmptyState
          icon={<CalendarIcon className="w-16 h-16" />}
          title={plan ? "Your last strategy run didn’t finish" : "Generate your 30-day plan"}
          description={
            plan
              ? `${BRAND_NAME} found an incomplete strategy draft for this month. Generate again to rebuild the plan and create the execution items.`
              : `${BRAND_NAME} will analyze your product, generate a 30-day distribution plan, and create the items you can review and publish.`
          }
          action={
            <Button size="lg" onClick={handleGeneratePlan} loading={generating}>
              <BoltIcon className="w-5 h-5" />
              {generating ? "Generating…" : plan ? "Rebuild plan" : "Generate plan"}
            </Button>
          }
        />
        {generating && (
          <p className="text-center text-sm text-gray-400 mt-4 animate-pulse-soft">
            This takes about 30 seconds…
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-600">Plan</p>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">Your 30-day distribution plan</h1>
          <p className="mt-2 text-sm text-gray-500 max-w-2xl leading-relaxed">
            This page is for deciding what to do. The queue is where you review drafts, approve them, and actually publish.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setView("list")}
              className={cn(
                "px-3 py-2 text-sm flex items-center gap-1.5 transition-colors",
                view === "list" ? "bg-brand-50 text-brand-700" : "text-gray-500 hover:bg-gray-50"
              )}
            >
              <ListBulletIcon className="w-4 h-4" />
              List
            </button>
            <button
              onClick={() => setView("calendar")}
              className={cn(
                "px-3 py-2 text-sm flex items-center gap-1.5 transition-colors",
                view === "calendar" ? "bg-brand-50 text-brand-700" : "text-gray-500 hover:bg-gray-50"
              )}
            >
              <CalendarIcon className="w-4 h-4" />
              Calendar
            </button>
          </div>

          <Link href={`/sites/${siteId}/queue`}>
            <Button size="sm">
              Open queue
              <ArrowRightIcon className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>

      <Card padding="md" className="border-brand-200 bg-brand-50/40">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-wide text-brand-600 font-semibold">Next best action</p>
            <p className="mt-2 text-sm font-semibold text-gray-900 leading-relaxed">{nextAction}</p>
            {strategy?.overview && (
              <p className="mt-2 text-sm text-gray-600 max-w-3xl leading-relaxed">{strategy.overview}</p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {noContent > 0 && (
              <Button onClick={handleBulkGenerate} loading={bulkGenerating} size="sm">
                <BoltIcon className="w-4 h-4" />
                {bulkGenerating
                  ? bulkProgress
                    ? `Generating ${bulkProgress.done}/${bulkProgress.total}…`
                    : "Generating…"
                  : `Generate ${noContent} draft${noContent === 1 ? "" : "s"}`}
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={handleReprioritize} loading={reprioritizing}>
              <BoltIcon className="w-4 h-4" />
              {reprioritizing ? "Reprioritizing…" : "Re-prioritize"}
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Plan items", value: items.length, helper: "total actions" },
          { label: "Drafts ready", value: withContent, helper: "content generated" },
          { label: "Approved", value: approved, helper: "ready or published" },
          { label: "Needs drafts", value: noContent, helper: "not generated yet" },
        ].map((stat) => (
          <Card key={stat.label} padding="md">
            <p className="text-xs uppercase tracking-wide text-gray-400">{stat.label}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="mt-1 text-xs text-gray-500">{stat.helper}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card padding="md">
          <p className="text-xs uppercase tracking-wide text-gray-400">North star</p>
          <p className="mt-2 text-sm font-semibold text-gray-900 leading-relaxed">
            {strategy?.north_star_goal || "Turn distribution into compounding user growth."}
          </p>
        </Card>
        <Card padding="md">
          <p className="text-xs uppercase tracking-wide text-gray-400">Acquisition wedge</p>
          <p className="mt-2 text-sm font-semibold text-gray-900 leading-relaxed">
            {strategy?.acquisition_wedge || "Find the sharpest demand pocket and own it before broadening."}
          </p>
        </Card>
        <Card padding="md">
          <p className="text-xs uppercase tracking-wide text-gray-400">Growth thesis</p>
          <p className="mt-2 text-sm font-semibold text-gray-900 leading-relaxed">
            {strategy?.growth_thesis || strategy?.overview}
          </p>
        </Card>
      </div>

      {(strategicBets.length > 0 || risks.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card padding="md">
            <p className="text-xs uppercase tracking-wide text-gray-400">Strategic bets</p>
            <div className="mt-3 space-y-2">
              {strategicBets.length > 0 ? strategicBets.map((bet) => (
                <div key={bet} className="rounded-xl border border-brand-100 bg-brand-50/50 px-3 py-2 text-sm text-brand-900">
                  {bet}
                </div>
              )) : (
                <p className="text-sm text-gray-400">No strategic bets captured yet.</p>
              )}
            </div>
          </Card>

          <Card padding="md">
            <p className="text-xs uppercase tracking-wide text-gray-400">Constraints to watch</p>
            <div className="mt-3 space-y-2">
              {risks.length > 0 ? risks.map((risk) => (
                <div key={risk} className="rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2 text-sm text-amber-900">
                  {risk}
                </div>
              )) : (
                <p className="text-sm text-gray-400">No explicit constraints captured yet.</p>
              )}
            </div>
          </Card>
        </div>
      )}

      {(growthLoops.length > 0 || channelTheses.length > 0) && (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
          <Card padding="md" className="xl:col-span-3">
            <p className="text-xs uppercase tracking-wide text-gray-400">Compounding loops</p>
            <div className="mt-3 space-y-3">
              {growthLoops.length > 0 ? growthLoops.map((loop) => (
                <div key={loop.name} className="rounded-2xl border border-gray-100 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-gray-900">{loop.name}</p>
                    <Badge variant="info">Loop</Badge>
                  </div>
                  <p className="mt-2 text-sm text-gray-600 leading-relaxed">{loop.mechanism}</p>
                  <p className="mt-2 text-xs text-gray-500 leading-relaxed">{loop.why_it_compounds}</p>
                </div>
              )) : (
                <p className="text-sm text-gray-400">No growth loops captured yet.</p>
              )}
            </div>
          </Card>

          <Card padding="md" className="xl:col-span-2">
            <p className="text-xs uppercase tracking-wide text-gray-400">Channel theses</p>
            <div className="mt-3 space-y-3">
              {channelTheses.length > 0 ? channelTheses.map((thesis) => (
                <div key={`${thesis.channel}-${thesis.rationale}`} className="rounded-2xl border border-gray-100 p-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded-full capitalize",
                        CHANNEL_BADGE[thesis.channel] || "bg-gray-100 text-gray-600"
                      )}
                    >
                      {thesis.channel}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-700 leading-relaxed">{thesis.rationale}</p>
                  <p className="mt-2 text-xs text-gray-500 leading-relaxed">{thesis.success_signal}</p>
                </div>
              )) : (
                <p className="text-sm text-gray-400">No channel theses captured yet.</p>
              )}
            </div>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <Card padding="md" className="xl:col-span-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-wide text-gray-400">Active growth bets</p>
            {growthSummary && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{growthSummary.published} published</span>
                <span>{growthSummary.failed} failed</span>
                <span>{growthSummary.approved} approved</span>
              </div>
            )}
          </div>
          <div className="mt-3 space-y-3">
            {growthLoading ? (
              <div className="py-6 flex justify-center">
                <Spinner />
              </div>
            ) : experiments.length > 0 ? experiments.map((experiment) => (
              <div key={experiment.id} className="rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-gray-900 leading-relaxed">{experiment.hypothesis}</p>
                  <Badge variant="info">{experiment.confidence}%</Badge>
                </div>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  {experiment.target_channel && (
                    <span
                      className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded-full capitalize",
                        CHANNEL_BADGE[experiment.target_channel] || "bg-gray-100 text-gray-600"
                      )}
                    >
                      {experiment.target_channel}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">{experiment.source.replace(/_/g, " ")}</span>
                </div>
                {experiment.rationale && (
                  <p className="mt-2 text-sm text-gray-600 leading-relaxed">{experiment.rationale}</p>
                )}
                <p className="mt-2 text-sm text-gray-800">
                  <span className="font-medium">Success signal:</span> {experiment.success_metric}
                </p>
                {experiment.next_action && (
                  <p className="mt-2 text-sm text-brand-700">
                    <span className="font-medium">Next:</span> {experiment.next_action}
                  </p>
                )}
              </div>
            )) : (
              <p className="text-sm text-gray-400">Generate or rebuild a plan to seed the first set of growth bets. Then use Queue to work through the actual execution.</p>
            )}
          </div>
        </Card>

        <Card padding="md" className="xl:col-span-2">
          <p className="text-xs uppercase tracking-wide text-gray-400">Recent signals</p>
          <div className="mt-3 space-y-3">
            {growthLoading ? (
              <div className="py-6 flex justify-center">
                <Spinner />
              </div>
            ) : recentSignals.length > 0 ? recentSignals.map((signal) => (
              <div key={signal.id} className="rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-900">
                    {signal.signal_type.replace(/_/g, " ")}
                  </p>
                  <span className="text-xs text-gray-400">
                    {new Date(signal.occurred_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {signal.channel ? `${signal.channel} • ` : ""}{signal.metric_name} • {signal.metric_value}
                </p>
              </div>
            )) : (
              <p className="text-sm text-gray-400">Signals show what happened after execution. They become useful after content actually gets shipped from the queue.</p>
            )}
          </div>
          {growthSummary?.topChannels?.length ? (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Top signal channels</p>
              <div className="flex flex-wrap gap-2">
                {growthSummary.topChannels.map((entry) => (
                  <Badge key={entry.channel} variant="default" className="capitalize">
                    {entry.channel} {entry.count}
                  </Badge>
                ))}
              </div>
              {growthSummary.emailsSent > 0 && (
                <p className="mt-3 text-xs text-gray-500">{growthSummary.emailsSent} emails sent from tracked campaigns.</p>
              )}
            </div>
          ) : null}
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        {Object.entries(CHANNEL_DOT).map(([channel, dot]) => (
          <div key={channel} className="flex items-center gap-1.5 text-xs text-gray-500">
            <div className={cn("w-2.5 h-2.5 rounded-full", dot)} />
            <span className="capitalize">{channel}</span>
          </div>
        ))}
      </div>

      {view === "list" && (
        <div className="space-y-8">
          {[1, 2, 3, 4].map((week) => {
            const weekItems = byWeek[week] || [];
            const theme = weekThemes.find((w) => w.week === week);
            if (weekItems.length === 0) return null;

            return (
              <div key={week}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-brand-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                    W{week}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">
                      {theme?.theme || `Week ${week}`}
                    </p>
                    {theme?.focus && (
                      <p className="text-xs text-gray-400">{theme.focus}</p>
                    )}
                  </div>
                  <Badge variant="default" className="ml-auto">
                    {weekItems.length} items
                  </Badge>
                </div>

                <div className="space-y-2">
                  {weekItems.map((item) => {
                    const statusCfg = STATUS_CONFIG[item.status];
                    return (
                      <div
                        key={item.id}
                        className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-4 shadow-card hover:shadow-card-hover transition-all"
                      >
                        <div
                          className={cn(
                            "w-1.5 h-12 rounded-full flex-shrink-0",
                            CHANNEL_DOT[item.channel] || "bg-gray-300"
                          )}
                        />

                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">
                            {item.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span
                              className={cn(
                                "text-xs font-medium px-2 py-0.5 rounded-full capitalize",
                                CHANNEL_BADGE[item.channel] || "bg-gray-100 text-gray-600"
                              )}
                            >
                              {item.channel}
                            </span>
                            {item.scheduled_date && (
                              <span className="text-xs text-gray-400">
                                {new Date(item.scheduled_date).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!item.body && (
                            <span className="text-xs text-amber-500 font-medium">
                              Needs draft
                            </span>
                          )}
                          {item.body && (
                            <div
                              className={cn(
                                "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
                                statusCfg.class
                              )}
                            >
                              {statusCfg.icon}
                              {statusCfg.label}
                            </div>
                          )}
                          {item.auto_executable && (
                            <Badge variant="info" className="text-xs">Auto</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "calendar" && (
        <CalendarView items={items} />
      )}
    </div>
  );
}

function CalendarView({ items }: { items: ContentItem[] }) {
  const byDate: Record<string, ContentItem[]> = {};
  items.forEach((item) => {
    if (!item.scheduled_date) return;
    const key = item.scheduled_date.slice(0, 10);
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(item);
  });

  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const scheduledDates = items
    .map((item) => item.scheduled_date)
    .filter((date): date is string => !!date)
    .sort();

  const today = new Date();
  const monthsToRender = scheduledDates.length > 0
    ? Array.from(
        new Set(
          scheduledDates.map((date) => {
            const parsed = new Date(`${date}T00:00:00`);
            return `${parsed.getFullYear()}-${parsed.getMonth()}`;
          })
        )
      ).map((key) => {
        const [year, month] = key.split("-").map(Number);
        return { year, month };
      })
    : [{ year: today.getFullYear(), month: today.getMonth() }];

  return (
    <div className="space-y-6">
      {monthsToRender.map(({ year, month }) => {
        const monthDate = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = monthDate.getDay();
        const startPadding = (firstDayOfMonth + 6) % 7;

        return (
          <Card key={`${year}-${month}`} padding="none">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">
                {monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <div className="grid grid-cols-7 min-w-[420px]">
                {DAYS.map((d) => (
                  <div
                    key={`${year}-${month}-${d}`}
                    className="p-2 text-center text-xs font-semibold text-gray-400 border-b border-gray-50"
                  >
                    {d}
                  </div>
                ))}
                {Array.from({ length: startPadding }).map((_, i) => (
                  <div
                    key={`${year}-${month}-pad-${i}`}
                    className="min-h-[80px] p-2 border-b border-r border-gray-50 bg-gray-50/30"
                  />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const dayItems = byDate[dateStr] || [];
                  const isToday =
                    year === today.getFullYear() &&
                    month === today.getMonth() &&
                    day === today.getDate();

                  return (
                    <div
                      key={dateStr}
                      className={cn(
                        "min-h-[80px] p-2 border-b border-r border-gray-50",
                        isToday && "bg-brand-50/30"
                      )}
                    >
                      <div
                        className={cn(
                          "text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1",
                          isToday ? "bg-brand-500 text-white" : "text-gray-500"
                        )}
                      >
                        {day}
                      </div>
                      <div className="space-y-0.5">
                        {dayItems.slice(0, 3).map((item) => (
                          <div
                            key={item.id}
                            className={cn(
                              "text-xs px-1.5 py-0.5 rounded font-medium truncate",
                              CHANNEL_BADGE[item.channel] || "bg-gray-100 text-gray-600"
                            )}
                            title={item.title}
                          >
                            {item.title.slice(0, 20)}{item.title.length > 20 ? "…" : ""}
                          </div>
                        ))}
                        {dayItems.length > 3 && (
                          <div className="text-xs text-gray-400 pl-1.5">
                            +{dayItems.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
