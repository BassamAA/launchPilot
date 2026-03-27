import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { GettingStartedChecklist } from "@/components/onboarding/GettingStartedChecklist";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { normalizeBusinessProfile } from "@/lib/business-profile";
import { getFunnelIntelligence } from "@/lib/funnel";
import { buildPersonaSummary, sortLabelsForPersona } from "@/lib/onboarding";
import { getPartnerIntelligence } from "@/lib/partners";
import { getPriorityActions } from "@/lib/priority-actions";
import { hasSocialStrategy } from "@/lib/social-strategy";
import { getUser, getSupabaseServerClient } from "@/lib/supabase";
import { BRAND_NAME } from "@/lib/brand";
import { PriorityActionsBar } from "@/components/dashboard/PriorityActionsBar";
import { StatCard } from "@/components/dashboard/StatCard";
import { SiteActionsBar } from "@/components/sites/SiteActionsBar";
import { Badge, Card, Button } from "@/components/ui";
import {
  Site,
  ContentItem,
  ActivityLog,
  GrowthExperiment,
  GrowthSignal,
  PartnerTarget,
  FunnelRecommendation,
  OfferTest,
  GrowthSurface,
} from "@/types";
import {
  DocumentTextIcon,
  CalendarIcon,
  QueueListIcon,
  BoltIcon,
  ArrowRightIcon,
  ClockIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import {
  CheckCircleIcon,
  DocumentTextIcon as DocSolid,
  BoltIcon as BoltSolid,
  UsersIcon,
} from "@heroicons/react/24/solid";

export default async function SiteDashboardPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = getSupabaseServerClient();

  const { data: site } = await supabase
    .from("sites")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!site) notFound();

  const siteObj = site as Site;
  const businessProfile = normalizeBusinessProfile(siteObj.business_profile_json);
  const hasSocialStrategyReady = hasSocialStrategy(siteObj.social_strategy_json);
  const { persona, config: onboardingConfig } = buildPersonaSummary(siteObj);

  // Content stats
  const { data: items } = await supabase
    .from("content_items")
    .select("id, status, channel, body, created_at, published_url")
    .eq("site_id", params.id);

  const { data: queuePreview } = await supabase
    .from("content_items")
    .select("*")
    .eq("site_id", params.id)
    .eq("status", "draft")
    .neq("body", "")
    .order("scheduled_date", { ascending: true })
    .limit(3);

  const allItems = (items || []) as Pick<ContentItem, "id" | "status" | "channel" | "body" | "created_at" | "published_url">[];
  const totalGenerated = allItems.filter((i) => i.body).length;
  const totalApproved = allItems.filter((i) => ["approved", "published"].includes(i.status)).length;
  const totalPublished = allItems.filter((i) => i.status === "published").length;
  const pendingApproval = allItems.filter((i) => i.status === "draft" && i.body).length;
  const needsGeneration = allItems.filter((i) => !i.body).length;
  const initialQueueItems = (queuePreview || []) as ContentItem[];

  // Rough estimated reach
  const reachByChannel: Record<string, number> = {
    blog: 800,
    twitter: 300,
    reddit: 1500,
    email: 80,
    tiktok: 3000,
    directory: 400,
  };
  const estimatedReach = allItems
    .filter((i) => i.status === "published")
    .reduce((sum, i) => sum + (reachByChannel[i.channel] || 0), 0);

  // Channel breakdown
  const channelBreakdown = allItems.reduce<Record<string, number>>((acc, i) => {
    acc[i.channel] = (acc[i.channel] || 0) + 1;
    return acc;
  }, {});

  const { data: emailSends } = await supabase
    .from("email_sends")
    .select("status")
    .eq("site_id", params.id);

  const [{ data: activity }, { data: surfaces }, { data: connections }, { count: pageViewCount }, { count: conversionCount }, { count: productEventCount }] = await Promise.all([
    supabase
      .from("activity_log")
      .select("*")
      .eq("site_id", params.id)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("growth_surfaces")
      .select("*")
      .eq("site_id", params.id)
      .order("priority", { ascending: true }),
    supabase
      .from("platform_connections")
      .select("*")
      .eq("site_id", params.id),
    supabase
      .from("page_views")
      .select("id", { count: "exact", head: true })
      .eq("site_id", params.id),
    supabase
      .from("conversions")
      .select("id", { count: "exact", head: true })
      .eq("site_id", params.id),
    supabase
      .from("product_events")
      .select("id", { count: "exact", head: true })
      .eq("site_id", params.id),
  ]);

  const { data: latestPlan } = await supabase
    .from("marketing_plans")
    .select("strategy_json, created_at")
    .eq("site_id", params.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: experiments } = await supabase
    .from("growth_experiments")
    .select("*")
    .eq("site_id", params.id)
    .eq("status", "active")
    .order("confidence", { ascending: false })
    .limit(4);

  const { data: growthSignals } = await supabase
    .from("growth_signals")
    .select("*")
    .eq("site_id", params.id)
    .order("occurred_at", { ascending: false })
    .limit(8);

  const strategy = latestPlan?.strategy_json as
    | {
        north_star_goal?: string;
        acquisition_wedge?: string;
        growth_thesis?: string;
      }
    | null;
  const activeExperiments = (experiments || []) as GrowthExperiment[];
  const recentSignals = (growthSignals || []) as GrowthSignal[];
  const signalChannelCounts = recentSignals.reduce<Record<string, number>>((acc, signal) => {
    if (signal.channel) {
      acc[signal.channel] = (acc[signal.channel] || 0) + 1;
    }
    return acc;
  }, {});

  const emailStats = (emailSends || []).reduce<Record<string, number>>((acc, send) => {
    acc[send.status] = (acc[send.status] || 0) + 1;
    return acc;
  }, {});

  const tweetsPosted = allItems.filter((item) => item.channel === "twitter" && item.status === "published").length;
  const blogPostsPublished = allItems.filter((item) => item.channel === "blog" && item.status === "published").length;
  const directoriesSubmitted = allItems.filter((item) => item.channel === "directory" && item.status === "published").length;
  const redditPosted = allItems.filter((item) => item.channel === "reddit" && item.status === "published").length;
  const emailSent = emailStats.sent || 0;
  const emailDelivered = emailStats.delivered || 0;
  const emailOpened = emailStats.opened || 0;
  const emailClicked = emailStats.clicked || 0;
  const openRate = emailDelivered ? Math.round((emailOpened / emailDelivered) * 100) : 0;
  const clickRate = emailDelivered ? Math.round((emailClicked / emailDelivered) * 100) : 0;

  const ACTION_ICONS: Record<string, string> = {
    site_analyzed: "🔍",
    brief_confirmed: "✅",
    plan_generated: "📅",
    bulk_generated: "⚡",
    content_approved: "👍",
    content_rejected: "❌",
    content_published: "🚀",
  };

  const [partnerIntel, funnelIntel] = await Promise.all([
    getPartnerIntelligence(params.id),
    getFunnelIntelligence(params.id),
  ]);
  const partnerTargets = partnerIntel.targets as PartnerTarget[];
  const funnelRecommendations = funnelIntel.recommendations as FunnelRecommendation[];
  const offerTests = funnelIntel.offerTests as OfferTest[];
  const growthSurfaces = (surfaces || []) as GrowthSurface[];
  const activeSurfaceCount = growthSurfaces.filter((surface) => surface.status === "active").length;
  const twitterConnected = Boolean((connections || []).some((connection) => connection.platform === "twitter"));
  const hasTrackingActivity = (pageViewCount || 0) > 0 || (conversionCount || 0) > 0 || (productEventCount || 0) > 0;
  const canReviewPerformance =
    Date.now() - new Date(siteObj.created_at).getTime() > 7 * 24 * 60 * 60 * 1000 &&
    (hasTrackingActivity || totalPublished > 0);

  // Last published date
  const lastPublishedItem = allItems
    .filter((i) => i.status === "published" && i.created_at)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  const lastPublishedAt = lastPublishedItem?.created_at || null;

  // Best pattern insight from latest snapshot (pulled from experiment rationale as proxy)
  const bestPatternInsight =
    activeExperiments[0]?.rationale
      ? activeExperiments[0].rationale.slice(0, 80)
      : null;

  const priorityActions = getPriorityActions({
    siteId: params.id,
    pendingApproval,
    totalPublished,
    twitterConnected,
    hasTrackingActivity,
    briefConfirmed: siteObj.brief_confirmed,
    totalGenerated,
    onboarding: siteObj.onboarding_json,
    activeExperiments,
    lastPublishedAt,
    recentItems: allItems,
    bestPatternInsight,
  });

  const quickNavItems = sortLabelsForPersona(
    [
      {
        label: "Marketing Brief",
        href: `/sites/${params.id}/brief`,
        icon: DocumentTextIcon,
        desc: siteObj.brief_confirmed ? "Confirmed" : "Needs review",
        urgent: !siteObj.brief_confirmed && !!siteObj.brief_json,
      },
      {
        label: "Growth Strategy",
        href: `/sites/${params.id}/plan`,
        icon: CalendarIcon,
        desc: totalGenerated > 0 ? `${allItems.length} actions live` : "Not generated",
      },
      {
        label: "Approval Queue",
        href: `/sites/${params.id}/queue`,
        icon: QueueListIcon,
        desc: siteObj.autopilot_enabled ? "Autopilot is handling this" : pendingApproval > 0 ? `${pendingApproval} waiting` : "All clear",
        urgent: !siteObj.autopilot_enabled && pendingApproval > 0,
      },
      {
        label: "All Content",
        href: `/sites/${params.id}/content`,
        icon: BoltIcon,
        desc: `${totalGenerated} pieces`,
      },
      {
        label: "Performance",
        href: `/sites/${params.id}/performance`,
        icon: ChartBarIcon,
        desc: "Outcomes & signals",
      },
      {
        label: "Social Strategy",
        href: `/sites/${params.id}/social`,
        icon: SparklesIcon,
        desc: hasSocialStrategyReady ? "Playbooks ready" : "Generate playbooks",
      },
      {
        label: "Connections",
        href: `/sites/${params.id}/settings`,
        icon: Cog6ToothIcon,
        desc: "Twitter, blog, email",
      },
    ],
    persona
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1.5 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{siteObj.name}</h1>
            <Badge
              variant={
                siteObj.status === "active" ? "success" :
                siteObj.status === "analyzing" ? "warning" :
                siteObj.status === "error" ? "danger" : "default"
              }
            >
              {siteObj.status}
            </Badge>
            {siteObj.autopilot_enabled && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-brand-500 text-white">
                ⚡ AUTOPILOT
              </span>
            )}
          </div>
          <a
            href={siteObj.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-400 hover:text-brand-600 transition-colors"
          >
            {siteObj.url} ↗
          </a>
        </div>
      </div>

      {/* Contextual action prompts */}
      <SiteActionsBar
        siteId={params.id}
        briefConfirmed={siteObj.brief_confirmed}
        hasBrief={!!siteObj.brief_json}
        totalGenerated={totalGenerated}
        pendingApproval={pendingApproval}
        needsGeneration={needsGeneration}
      />

      {priorityActions.length > 0 && (
        <PriorityActionsBar actions={priorityActions} />
      )}

      {siteObj.brief_confirmed && (
        <OnboardingWizard
          siteId={params.id}
          persona={persona}
          onboarding={siteObj.onboarding_json}
          surfaces={growthSurfaces}
          initialQueueItems={initialQueueItems}
          initialApprovedCount={totalApproved}
        />
      )}

      {siteObj.brief_confirmed && (
        <GettingStartedChecklist
          siteId={params.id}
          persona={persona}
          onboarding={siteObj.onboarding_json}
          briefConfirmed={siteObj.brief_confirmed}
          activeSurfaceCount={activeSurfaceCount}
          twitterConnected={twitterConnected}
          approvedCount={totalApproved}
          hasTrackingActivity={hasTrackingActivity}
          canReviewPerformance={canReviewPerformance}
        />
      )}

      {businessProfile && (
        <Card padding="md">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Business Profile</h3>
              <p className="mt-1 text-sm text-gray-500">
                Canonical business context merged from the site and any connected public profiles.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {businessProfile.business_type && <Badge variant="info">{businessProfile.business_type}</Badge>}
              {businessProfile.monetization_model && (
                <Badge variant="purple">{businessProfile.monetization_model}</Badge>
              )}
              <Badge variant="default">{businessProfile.primary_source}</Badge>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-400">Audience</p>
              <p className="mt-2 text-sm text-gray-700">
                {businessProfile.target_audience || "No explicit audience inferred yet."}
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-400">Offerings</p>
              <p className="mt-2 text-sm text-gray-700">
                {businessProfile.offerings.join(", ") || "No offerings extracted yet."}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="default">{persona.replace(/_/g, " ")}</Badge>
            {businessProfile.existing_channels.map((channel) => (
              <Badge key={channel} variant="success">
                {channel}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Content Generated"
          value={totalGenerated}
          icon={<DocSolid className="w-5 h-5" />}
          color="indigo"
        />
        <StatCard
          label="Approved"
          value={totalApproved}
          icon={<CheckCircleIcon className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          label="Published"
          value={totalPublished}
          icon={<BoltSolid className="w-5 h-5" />}
          color="amber"
        />
        <StatCard
          label="Est. Reach"
          value={
            estimatedReach >= 1000
              ? `${(estimatedReach / 1000).toFixed(1)}K`
              : estimatedReach || "—"
          }
          icon={<UsersIcon className="w-5 h-5" />}
          color="coral"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: "Tweets Posted", value: tweetsPosted },
          { label: "Blog Posts", value: blogPostsPublished },
          { label: "Emails Sent", value: emailSent },
          { label: "Directories Submitted", value: directoriesSubmitted },
          { label: "Reddit Posts", value: redditPosted },
        ].map((card) => (
          <Card key={card.label} padding="md">
            <p className="text-xs uppercase tracking-wide text-gray-400">{card.label}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{card.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card padding="md">
          <h3 className="font-bold text-gray-900 mb-3 text-sm">Email Performance</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Delivered", emailDelivered],
              ["Opened", emailOpened],
              ["Clicked", emailClicked],
              ["Open Rate", `${openRate}%`],
              ["Click Rate", `${clickRate}%`],
              ["Bounced", emailStats.bounced || 0],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">{value}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="md">
          <h3 className="font-bold text-gray-900 mb-3 text-sm">Publishing Notes</h3>
          <div className="space-y-3 text-sm text-gray-600">
            <p>Twitter engagement and blog page views can be added later once analytics integrations exist.</p>
            <p>Email metrics here come from the `email_sends` tracking table and refresh cron.</p>
            <p>Directory and Reddit counts reflect items users marked complete after manual posting.</p>
          </div>
        </Card>
      </div>

      {strategy && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card padding="md">
            <p className="text-xs uppercase tracking-wide text-gray-400">North Star</p>
            <p className="mt-2 text-sm font-semibold text-gray-900 leading-relaxed">
              {strategy.north_star_goal || "Turn distribution into compounding user growth."}
            </p>
          </Card>
          <Card padding="md">
            <p className="text-xs uppercase tracking-wide text-gray-400">Acquisition Wedge</p>
            <p className="mt-2 text-sm font-semibold text-gray-900 leading-relaxed">
              {strategy.acquisition_wedge || "Find the sharpest demand wedge and own it first."}
            </p>
          </Card>
          <Card padding="md">
            <p className="text-xs uppercase tracking-wide text-gray-400">Current Thesis</p>
            <p className="mt-2 text-sm font-semibold text-gray-900 leading-relaxed">
              {strategy.growth_thesis || "Use the existing execution engine to find and scale compounding growth loops."}
            </p>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <Card padding="md" className="xl:col-span-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-bold text-gray-900 text-sm">Active Growth Bets</h3>
            <Link href={`/sites/${params.id}/plan`} className="text-sm text-brand-600 hover:underline">
              Open strategy
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {activeExperiments.length > 0 ? activeExperiments.map((experiment) => (
              <div key={experiment.id} className="rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-gray-900 text-sm leading-relaxed">{experiment.hypothesis}</p>
                  <Badge variant="info">{experiment.confidence}%</Badge>
                </div>
                <p className="mt-2 text-xs uppercase tracking-wide text-gray-400">
                  {experiment.target_channel ? `${experiment.target_channel} bet` : "Cross-channel bet"}
                </p>
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
              <p className="text-sm text-gray-400 py-4">
                Generate a plan to seed the first set of growth bets.
              </p>
            )}
          </div>
        </Card>

        <Card padding="md" className="xl:col-span-2">
          <h3 className="font-bold text-gray-900 text-sm">Latest Signals</h3>
          <div className="mt-4 space-y-3">
            {recentSignals.length > 0 ? recentSignals.map((signal) => (
              <div key={signal.id} className="rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-900">
                    {signal.signal_type.replace(/_/g, " ")}
                  </p>
                  <span className="text-xs text-gray-400">
                    {new Date(signal.occurred_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {signal.channel ? `${signal.channel} • ` : ""}{signal.metric_name} • {signal.metric_value}
                </p>
              </div>
            )) : (
              <p className="text-sm text-gray-400 py-4">
                Signals start appearing as content gets approved, published, and sent.
              </p>
            )}
          </div>
          {Object.keys(signalChannelCounts).length > 0 && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Most active channels</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(signalChannelCounts)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 4)
                  .map(([channel, count]) => (
                    <Badge key={channel} variant="default" className="capitalize">
                      {channel} {count}
                    </Badge>
                  ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card padding="md">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-bold text-gray-900 text-sm">Partner Intelligence</h3>
            <Link href={`/sites/${params.id}/surfaces`}>
              <Button variant="outline" size="sm">Open surfaces</Button>
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {partnerTargets.length > 0 ? (
              partnerTargets.slice(0, 3).map((target) => (
                <div key={target.id || `${target.platform}-${target.handle || target.audience_fit}`} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-gray-900 capitalize">{target.platform}</p>
                    <Badge variant="info">{target.fit_score}% fit</Badge>
                  </div>
                  <p className="mt-2 text-sm text-gray-700">{target.audience_fit || target.rationale || "High-fit niche partner target."}</p>
                  {target.content_fit && (
                    <p className="mt-2 text-xs text-gray-500">Content: {target.content_fit}</p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400 py-4">
                No partner intelligence generated yet.
              </p>
            )}
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-bold text-gray-900 text-sm">Funnel Intelligence</h3>
            <Link href={`/sites/${params.id}/performance`}>
              <Button variant="outline" size="sm">Open performance</Button>
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {funnelRecommendations.length > 0 ? (
              funnelRecommendations.slice(0, 3).map((item) => (
                <div key={item.id || `${item.category}-${item.title}`} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                    <Badge variant="warning">P{item.priority}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-gray-700">{item.recommendation}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400 py-4">
                No funnel recommendations yet.
              </p>
            )}
            {offerTests.length > 0 && (
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-xs uppercase tracking-wide text-blue-700">Suggested offer test</p>
                <p className="mt-2 text-sm font-semibold text-blue-900">{offerTests[0].hypothesis}</p>
                <p className="mt-1 text-sm text-blue-800">{offerTests[0].proposed_change}</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick nav */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          {quickNavItems.map(({ label, href, icon: Icon, desc, urgent }) => (
            <Link key={href} href={href}>
              <Card hover padding="md" className={urgent ? "border-amber-200 bg-amber-50/30" : ""}>
                <Icon className={`w-6 h-6 mb-3 ${urgent ? "text-amber-500" : "text-brand-500"}`} />
                <p className="font-semibold text-gray-900 text-sm">{label}</p>
                <p className={`text-xs mt-1 ${urgent ? "text-amber-600 font-medium" : "text-gray-400"}`}>
                  {desc}
                </p>
              </Card>
            </Link>
          ))}
        </div>

        {/* Channel breakdown */}
        <Card padding="md">
          <h3 className="font-bold text-gray-900 mb-4 text-sm">Content by Channel</h3>
          <p className="mb-4 text-xs text-gray-400">
            {BRAND_NAME} is emphasizing {onboardingConfig.featuresToHighlight.join(", ").replace(/_/g, " ")} for this persona first.
          </p>
          {Object.keys(channelBreakdown).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(channelBreakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([channel, count]) => {
                  const pct = Math.round((count / allItems.length) * 100);
                  const colors: Record<string, string> = {
                    blog: "bg-emerald-400",
                    twitter: "bg-sky-400",
                    reddit: "bg-orange-400",
                    email: "bg-violet-400",
                    tiktok: "bg-pink-400",
                    directory: "bg-indigo-400",
                  };
                  return (
                    <div key={channel}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="capitalize text-gray-600 font-medium">{channel}</span>
                        <span className="text-gray-400">{count}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${colors[channel] || "bg-gray-400"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">
              No content yet
            </p>
          )}
        </Card>
      </div>

      {/* Activity feed */}
      {activity && activity.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Recent Activity</h2>
            <Link
              href={`/sites/${params.id}/activity`}
              className="text-sm text-brand-600 hover:underline flex items-center gap-1"
            >
              View all <ArrowRightIcon className="w-3.5 h-3.5" />
            </Link>
          </div>
          <Card padding="none">
            <ul className="divide-y divide-gray-50">
              {(activity as ActivityLog[]).map((entry) => (
                <li key={entry.id} className="flex items-start gap-3 p-4 hover:bg-gray-50/50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-base flex-shrink-0">
                    {ACTION_ICONS[entry.action] || "📌"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700">{entry.description}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <ClockIcon className="w-3 h-3 text-gray-300" />
                      <p className="text-xs text-gray-400">
                        {new Date(entry.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
