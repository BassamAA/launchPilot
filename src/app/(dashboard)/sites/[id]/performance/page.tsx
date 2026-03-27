"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Badge, Card, EmptyState, Spinner } from "@/components/ui";
import { BRAND_NAME } from "@/lib/brand";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface PerformanceResponse {
  overview: {
    totalImpressions: number;
    totalEngagement: number;
    contentPublished: number;
    totalClicks: number;
    totalConversions: number;
    totalActivated: number;
    totalRevenueValue: number;
    bestPerformingPiece: {
      id: string;
      title: string;
      channel: string;
      engagement: number;
      impressions: number;
      clicks?: number;
      conversions?: number;
      activated?: number;
      revenueValue?: number;
    } | null;
  };
  channelBreakdown: Array<{
    channel: string;
    impressions: number;
    engagement: number;
    published: number;
    clicks: number;
    conversions: number;
    conversionRate: number;
    onboardingComplete: number;
    activated: number;
    revenueEvents: number;
    revenueValue: number;
  }>;
  attribution: {
    totalClicks: number;
    totalConversions: number;
    totalActivated: number;
    totalRevenueValue: number;
    overallConversionRate: number;
    trackingInstalled: boolean;
    lastConversionAt: string | null;
    topConvertingContent: Array<{
      id: string;
      title: string;
      channel: string;
      clicks?: number;
      conversions?: number;
      conversionRate?: number;
      activated?: number;
      revenueValue?: number;
    }>;
  };
  funnel: {
    totalClicks: number;
    totalSignups: number;
    totalOnboardingComplete: number;
    totalActivated: number;
    totalRevenueEvents: number;
    totalRevenueValue: number;
  };
  contentIntelligence: {
    sample_size: number;
    lessons_learned: string;
    top_pattern: {
      label: string;
      conversion_rate: number;
      sample_size: number;
    } | null;
    tag_summaries: Partial<Record<
      "hook_type" | "cta_type" | "tone",
      {
        best: { tag_value: string; conversion_rate: number } | null;
        metrics: Array<{ tag_value: string; conversion_rate: number; avg_clicks: number }>;
      }
    >>;
    explore_variants_in_flight: Array<{
      content_item_id: string;
      title: string;
      channel: string;
      variant_group: string;
    }>;
    recent_explore_wins: Array<{
      variant_group: string;
      winner_content_item_id: string;
      winner_title: string;
      channel: string;
      conversion_rate: number;
    }>;
  } | null;
  impressionsOverTime: Array<{
    date: string;
    twitter_impressions: number;
    blog_page_views: number;
    total_impressions: number;
    clicks: number;
    conversions: number;
    onboarding_complete: number;
    activated: number;
    subscribed: number;
  }>;
  topContent: Array<{
    id: string;
    title: string;
    channel: string;
    publishedUrl: string | null;
    impressions: number;
    engagement: number;
    metrics: Record<string, number>;
    clicks?: number;
    conversions?: number;
    conversionRate?: number;
    activated?: number;
    revenueValue?: number;
    uniqueVisitors?: number;
    topReferrers?: Array<{ referrer: string; count: number }>;
  }>;
}

export default function PerformancePage() {
  const params = useParams();
  const siteId = params.id as string;

  const [data, setData] = useState<PerformanceResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/sites/${siteId}/performance`);
        if (!res.ok) return;
        const payload = await res.json();
        if (active) {
          setData(payload);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [siteId]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (!data) {
    return (
      <EmptyState
        title="Performance data unavailable"
        description={`${BRAND_NAME} could not load performance data for this site yet.`}
      />
    );
  }

  const bestPiece = data.overview.bestPerformingPiece;
  const hookData = data.contentIntelligence?.tag_summaries.hook_type?.metrics || [];
  const ctaData = data.contentIntelligence?.tag_summaries.cta_type?.metrics || [];
  const toneData = data.contentIntelligence?.tag_summaries.tone?.metrics || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Performance</h1>
        <p className="mt-1 text-sm text-gray-500">
          Real outcome data from Twitter, hosted blog traffic, and email engagement.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          ["Total Impressions", formatNumber(data.overview.totalImpressions)],
          ["Total Engagement", formatNumber(data.overview.totalEngagement)],
          ["Tracked Clicks", formatNumber(data.overview.totalClicks)],
          ["Tracked Signups", formatNumber(data.overview.totalConversions)],
          ["Activated Users", formatNumber(data.overview.totalActivated)],
          ["Revenue Value", formatCurrency(data.overview.totalRevenueValue)],
          ["Content Published", formatNumber(data.overview.contentPublished)],
          ["Best Piece", bestPiece ? `${bestPiece.channel}: ${truncate(bestPiece.title, 28)}` : "No data"],
        ].map(([label, value]) => (
          <Card key={label} padding="md">
            <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
            <p className="mt-2 text-xl font-bold text-gray-900">{value}</p>
            {label === "Best Piece" && bestPiece && (
              <p className="mt-2 text-xs text-gray-500">
                {(bestPiece.revenueValue || 0) > 0
                  ? `${formatCurrency(bestPiece.revenueValue || 0)} revenue • ${bestPiece.activated || 0} activated`
                  : (bestPiece.conversions || 0) > 0
                  ? `${bestPiece.conversions} conversions • ${bestPiece.clicks || 0} clicks`
                  : `${bestPiece.engagement} engagement • ${bestPiece.impressions} impressions`}
              </p>
            )}
          </Card>
        ))}
      </div>

      <Card padding="md">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-bold text-gray-900 text-sm">Attribution</h2>
            <p className="mt-1 text-sm text-gray-500">
              {BRAND_NAME} is now tracking the path from published content to clicks and signups.
            </p>
          </div>
          <Badge variant={data.attribution.trackingInstalled ? "success" : "warning"}>
            {data.attribution.trackingInstalled ? "Tracking installed" : "Pixel not installed yet"}
          </Badge>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-400">Total Clicks</p>
            <p className="mt-2 text-xl font-bold text-gray-900">{formatNumber(data.attribution.totalClicks)}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-400">Total Signups</p>
            <p className="mt-2 text-xl font-bold text-gray-900">{formatNumber(data.attribution.totalConversions)}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-400">Conversion Rate</p>
            <p className="mt-2 text-xl font-bold text-gray-900">{data.attribution.overallConversionRate}%</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-400">Activated Users</p>
            <p className="mt-2 text-sm font-semibold text-gray-900">{formatNumber(data.attribution.totalActivated)}</p>
            <p className="mt-2 text-xs text-gray-500">Revenue value: {formatCurrency(data.attribution.totalRevenueValue)}</p>
          </div>
        </div>

        {!data.attribution.trackingInstalled && (
          <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
            Install the {BRAND_NAME} conversion pixel from the site settings page to connect clicks to signups.
          </div>
        )}
      </Card>

      <Card padding="md">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-bold text-gray-900 text-sm">Outcome Funnel</h2>
            <p className="mt-1 text-sm text-gray-500">
              {BRAND_NAME} is optimizing for downstream quality, not just surface-level signups.
            </p>
          </div>
          <Badge variant="info">Activation-aware</Badge>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
          {[
            ["Clicks", data.funnel.totalClicks],
            ["Signups", data.funnel.totalSignups],
            ["Onboarding", data.funnel.totalOnboardingComplete],
            ["Activated", data.funnel.totalActivated],
            ["Revenue Events", data.funnel.totalRevenueEvents],
            ["Revenue", formatCurrency(data.funnel.totalRevenueValue)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
              <p className="mt-2 text-xl font-bold text-gray-900">{value}</p>
            </div>
          ))}
        </div>
      </Card>

      {data.contentIntelligence && (
        <>
          <Card padding="md">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="font-bold text-gray-900 text-sm">Content Intelligence</h2>
                <p className="mt-1 text-sm text-gray-500">
                  {BRAND_NAME} is learning what messaging patterns actually convert for this site.
                </p>
              </div>
              <Badge variant="info">
                {formatNumber(data.contentIntelligence.sample_size)} tagged published pieces
              </Badge>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">Top Pattern</p>
                <p className="mt-2 text-sm font-semibold text-gray-900">
                  {data.contentIntelligence.top_pattern?.label || "Not enough data yet"}
                </p>
                {data.contentIntelligence.top_pattern && (
                  <p className="mt-2 text-xs text-gray-500">
                    {data.contentIntelligence.top_pattern.conversion_rate}% CVR across {data.contentIntelligence.top_pattern.sample_size} pieces
                  </p>
                )}
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">Best Hook</p>
                <p className="mt-2 text-sm font-semibold text-gray-900">
                  {data.contentIntelligence.tag_summaries.hook_type?.best?.tag_value || "Unknown"}
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  {data.contentIntelligence.tag_summaries.hook_type?.best?.conversion_rate || 0}% conversion rate
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">Best CTA</p>
                <p className="mt-2 text-sm font-semibold text-gray-900">
                  {data.contentIntelligence.tag_summaries.cta_type?.best?.tag_value || "Unknown"}
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  {data.contentIntelligence.tag_summaries.cta_type?.best?.conversion_rate || 0}% conversion rate
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
              {data.contentIntelligence.lessons_learned}
            </div>
          </Card>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card padding="md">
              <h2 className="font-bold text-gray-900 text-sm">Hook Types</h2>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hookData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="tag_value" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="conversion_rate" fill="#0284c7" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card padding="md">
              <h2 className="font-bold text-gray-900 text-sm">CTA Types</h2>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ctaData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="tag_value" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="conversion_rate" fill="#16a34a" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card padding="md">
              <h2 className="font-bold text-gray-900 text-sm">Tone</h2>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={toneData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="tag_value" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="conversion_rate" fill="#7c3aed" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card padding="md">
            <h2 className="font-bold text-gray-900 text-sm">Explore Variants</h2>
            {data.contentIntelligence.explore_variants_in_flight.length === 0 &&
            data.contentIntelligence.recent_explore_wins.length === 0 ? (
              <p className="mt-4 text-sm text-gray-400">No active explore variants yet.</p>
            ) : (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">In flight</p>
                  <div className="mt-3 space-y-2">
                    {data.contentIntelligence.explore_variants_in_flight.map((item) => (
                      <div key={item.content_item_id} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                        <p className="text-sm font-medium text-gray-900">{truncate(item.title, 72)}</p>
                        <p className="mt-1 text-xs text-gray-500">{item.channel} • {item.variant_group}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">Recent explore wins</p>
                  <div className="mt-3 space-y-2">
                    {data.contentIntelligence.recent_explore_wins.map((item) => (
                      <div key={item.winner_content_item_id} className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                        <p className="text-sm font-medium text-gray-900">{truncate(item.winner_title, 72)}</p>
                        <p className="mt-1 text-xs text-emerald-700">
                          {item.channel} • {item.conversion_rate}% CVR
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card padding="md">
          <h2 className="font-bold text-gray-900 text-sm">Channel Output vs Outcomes</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.channelBreakdown}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="channel" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="engagement" fill="#0f766e" radius={[6, 6, 0, 0]} />
                <Bar dataKey="clicks" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                <Bar dataKey="conversions" fill="#16a34a" radius={[6, 6, 0, 0]} />
                <Bar dataKey="activated" fill="#0284c7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card padding="md">
          <h2 className="font-bold text-gray-900 text-sm">Reach, Clicks, and Outcomes Over Time</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.impressionsOverTime}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(value) => value.slice(5)} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="twitter_impressions" stroke="#0284c7" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="blog_page_views" stroke="#16a34a" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="total_impressions" stroke="#7c3aed" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="clicks" stroke="#f59e0b" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="conversions" stroke="#dc2626" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="activated" stroke="#0284c7" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="subscribed" stroke="#7c3aed" strokeWidth={2} dot={false} strokeDasharray="6 4" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card padding="md">
        <h2 className="font-bold text-gray-900 text-sm">Top Converting Content</h2>
        {data.attribution.topConvertingContent.length === 0 ? (
          <p className="mt-4 text-sm text-gray-400">No tracked clicks or signups yet.</p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.attribution.topConvertingContent.slice(0, 6).map((item) => (
              <div key={item.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="default" className="capitalize">
                    {item.channel}
                  </Badge>
                  <span className="text-xs font-medium text-gray-500">
                    {(item.revenueValue || 0) > 0 ? formatCurrency(item.revenueValue || 0) : `${item.conversionRate || 0}% CVR`}
                  </span>
                </div>
                <p className="mt-3 font-medium text-gray-900">{truncate(item.title, 64)}</p>
                <p className="mt-2 text-sm text-gray-600">
                  {(item.activated || 0) > 0
                    ? `${formatNumber(item.activated || 0)} activated from ${formatNumber(item.conversions || 0)} signups`
                    : `${formatNumber(item.conversions || 0)} signups from ${formatNumber(item.clicks || 0)} clicks`}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card padding="md">
        <h2 className="font-bold text-gray-900 text-sm">Top Performing Content</h2>
        {data.topContent.length === 0 ? (
          <p className="mt-4 text-sm text-gray-400">No published content has performance data yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="py-3 pr-4">Content</th>
                  <th className="py-3 pr-4">Channel</th>
                  <th className="py-3 pr-4">Impressions</th>
                  <th className="py-3 pr-4">Engagement</th>
                  <th className="py-3 pr-4">Clicks</th>
                  <th className="py-3 pr-4">Signups</th>
                  <th className="py-3 pr-4">Activated</th>
                  <th className="py-3 pr-4">Revenue</th>
                  <th className="py-3 pr-4">Metrics</th>
                </tr>
              </thead>
              <tbody>
                {data.topContent.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 align-top">
                    <td className="py-4 pr-4">
                      <div className="font-medium text-gray-900">{item.title}</div>
                      {item.publishedUrl && (
                        <a
                          href={item.publishedUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-flex text-xs text-brand-600 hover:underline"
                        >
                          Open live content
                        </a>
                      )}
                    </td>
                    <td className="py-4 pr-4">
                      <Badge variant="default" className="capitalize">{item.channel}</Badge>
                    </td>
                    <td className="py-4 pr-4 font-medium text-gray-900">{formatNumber(item.impressions)}</td>
                    <td className="py-4 pr-4 font-medium text-gray-900">{formatNumber(item.engagement)}</td>
                    <td className="py-4 pr-4 font-medium text-gray-900">{formatNumber(item.clicks || 0)}</td>
                    <td className="py-4 pr-4 font-medium text-gray-900">
                      {formatNumber(item.conversions || 0)}
                      <div className="text-xs text-gray-400">{item.conversionRate || 0}% CVR</div>
                    </td>
                    <td className="py-4 pr-4 font-medium text-gray-900">{formatNumber(item.activated || 0)}</td>
                    <td className="py-4 pr-4 font-medium text-gray-900">{formatCurrency(item.revenueValue || 0)}</td>
                    <td className="py-4 pr-4">
                      <div className="space-y-1 text-xs text-gray-600">
                        {Object.entries(item.metrics).map(([key, value]) => (
                          <div key={key}>
                            {key.replace(/_/g, " ")}: {formatNumber(value)}
                          </div>
                        ))}
                        {item.uniqueVisitors !== undefined && (
                          <div>unique visitors: {formatNumber(item.uniqueVisitors)}</div>
                        )}
                        {item.topReferrers?.length ? (
                          <div>
                            top referrers: {item.topReferrers.map((entry) => `${truncate(entry.referrer, 24)} (${entry.count})`).join(", ")}
                          </div>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function formatNumber(value: number) {
  return Intl.NumberFormat("en-US", { notation: value >= 1000 ? "compact" : "standard" }).format(value);
}

function formatCurrency(value: number) {
  return Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
