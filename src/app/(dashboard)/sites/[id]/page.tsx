import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getUser, getSupabaseServerClient } from "@/lib/supabase";
import { getPriorityActions } from "@/lib/priority-actions";
import { hasSocialStrategy } from "@/lib/social-strategy";
import { SiteActionsBar } from "@/components/sites/SiteActionsBar";
import { PriorityActionsBar } from "@/components/dashboard/PriorityActionsBar";
import { Badge, Card } from "@/components/ui";
import { Site, ContentItem, GrowthExperiment } from "@/types";
import {
  SparklesIcon,
  QueueListIcon,
  CalendarIcon,
  LinkIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import {
  BoltIcon as BoltSolid,
  CheckCircleIcon,
  DocumentTextIcon as DocSolid,
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
  const hasSocialStrategyReady = hasSocialStrategy(siteObj.social_strategy_json);

  const [{ data: items }, { data: connections }, { data: experiments }] = await Promise.all([
    supabase
      .from("content_items")
      .select("id, status, channel, body, created_at, published_url")
      .eq("site_id", params.id),
    supabase
      .from("platform_connections")
      .select("platform")
      .eq("site_id", params.id),
    supabase
      .from("growth_experiments")
      .select("id, hypothesis, confidence, target_channel, rationale, next_action, success_metric")
      .eq("site_id", params.id)
      .eq("status", "active")
      .order("confidence", { ascending: false })
      .limit(3),
  ]);

  const allItems = (items || []) as Pick<ContentItem, "id" | "status" | "channel" | "body" | "created_at" | "published_url">[];
  const totalGenerated = allItems.filter((i) => i.body).length;
  const totalApproved = allItems.filter((i) => ["approved", "published"].includes(i.status)).length;
  const totalPublished = allItems.filter((i) => i.status === "published").length;
  const pendingApproval = allItems.filter((i) => i.status === "draft" && i.body).length;
  const needsGeneration = allItems.filter((i) => !i.body).length;
  const twitterConnected = Boolean((connections || []).some((c) => c.platform === "twitter"));
  const activeExperiments = (experiments || []) as GrowthExperiment[];

  const lastPublishedItem = allItems
    .filter((i) => i.status === "published" && i.created_at)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

  const priorityActions = getPriorityActions({
    siteId: params.id,
    pendingApproval,
    totalPublished,
    twitterConnected,
    hasTrackingActivity: false,
    briefConfirmed: siteObj.brief_confirmed,
    totalGenerated,
    onboarding: siteObj.onboarding_json,
    activeExperiments,
    lastPublishedAt: lastPublishedItem?.created_at || null,
    recentItems: allItems,
    bestPatternInsight: null,
  });

  const quickLinks = [
    {
      label: "Social Strategy",
      href: `/sites/${params.id}/social`,
      icon: SparklesIcon,
      desc: hasSocialStrategyReady ? "Playbooks ready — see daily plan" : "Generate your social playbooks",
      highlight: hasSocialStrategyReady,
    },
    {
      label: "Review & Publish",
      href: `/sites/${params.id}/queue`,
      icon: QueueListIcon,
      desc: pendingApproval > 0 ? `${pendingApproval} items waiting for review` : "Queue is clear",
      urgent: pendingApproval > 0,
    },
    {
      label: "Content Plan",
      href: `/sites/${params.id}/plan`,
      icon: CalendarIcon,
      desc: totalGenerated > 0 ? `${allItems.length} content actions` : "Generate your 30-day plan",
    },
    {
      label: "Connections",
      href: `/sites/${params.id}/settings`,
      icon: LinkIcon,
      desc: twitterConnected ? "Twitter connected" : "Connect your social accounts",
      urgent: !twitterConnected,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1 flex-wrap">
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

      {/* Action prompts */}
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

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
              <DocSolid className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalGenerated}</p>
              <p className="text-xs text-gray-400">Generated</p>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
              <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalApproved}</p>
              <p className="text-xs text-gray-400">Approved</p>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
              <BoltSolid className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalPublished}</p>
              <p className="text-xs text-gray-400">Published</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-4">
        {quickLinks.map(({ label, href, icon: Icon, desc, urgent, highlight }) => (
          <Link key={href} href={href}>
            <Card
              hover
              padding="md"
              className={
                urgent
                  ? "border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-900/10"
                  : highlight
                  ? "border-brand-200 dark:border-brand-700 bg-brand-50/30 dark:bg-brand-900/10"
                  : ""
              }
            >
              <div className="flex items-start justify-between gap-3">
                <Icon className={`w-5 h-5 mt-0.5 ${urgent ? "text-amber-500" : highlight ? "text-brand-500" : "text-gray-400 dark:text-gray-500"}`} />
                <ArrowRightIcon className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
              </div>
              <p className="mt-3 font-semibold text-gray-900 dark:text-white text-sm">{label}</p>
              <p className={`text-xs mt-1 ${urgent ? "text-amber-600 dark:text-amber-400 font-medium" : highlight ? "text-brand-600 dark:text-brand-400" : "text-gray-400 dark:text-gray-500"}`}>
                {desc}
              </p>
            </Card>
          </Link>
        ))}
      </div>

      {/* Active growth bets — only if they exist */}
      {activeExperiments.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Active Growth Bets</h2>
            <Link href={`/sites/${params.id}/plan`} className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1">
              Open plan <ArrowRightIcon className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {activeExperiments.map((experiment) => (
              <Card key={experiment.id} padding="md">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm leading-relaxed">{experiment.hypothesis}</p>
                  <Badge variant="info">{experiment.confidence}%</Badge>
                </div>
                {experiment.next_action && (
                  <p className="mt-2 text-sm text-brand-700 dark:text-brand-300">
                    Next: {experiment.next_action}
                  </p>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
