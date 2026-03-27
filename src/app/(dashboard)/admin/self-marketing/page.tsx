import { notFound, redirect } from "next/navigation";
import { SelfMarketingReviewPanel } from "@/components/sites/SelfMarketingReviewPanel";
import { Badge, Card } from "@/components/ui";
import { getSitePerformanceData } from "@/lib/performance";
import { ensureSelfMarketingSite } from "@/lib/self-marketing";
import { getSupabaseAdminClient, getUser } from "@/lib/supabase";
import { ContentItem } from "@/types";
import { BRAND_NAME } from "@/lib/brand";

export default async function SelfMarketingAdminPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  if (!process.env.ADMIN_EMAIL || user.email !== process.env.ADMIN_EMAIL) {
    notFound();
  }

  const supabase = getSupabaseAdminClient();
  const { site } = await ensureSelfMarketingSite(supabase);
  const performance = await getSitePerformanceData(site.id, supabase);

  const { data: pendingItems } = await supabase
    .from("content_items")
    .select("*")
    .eq("site_id", site.id)
    .in("status", ["draft", "approved"])
    .neq("body", "")
    .in("channel", ["twitter", "reddit", "email", "tiktok"])
    .order("created_at", { ascending: false })
    .limit(12);

  const pendingReview = (pendingItems || []) as ContentItem[];

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Self-Marketing Admin</h1>
            <Badge variant="info">System site</Badge>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {BRAND_NAME} is using the same growth engine on itself. Review higher-risk content here and track whether self-marketing is producing signups.
          </p>
        </div>
        <div className="text-sm text-gray-500">
          <p>{site.url}</p>
          <p className="mt-1">Site ID: {site.id}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card padding="md">
          <p className="text-xs uppercase tracking-wide text-gray-400">Clicks</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{performance.funnel.totalClicks}</p>
        </Card>
        <Card padding="md">
          <p className="text-xs uppercase tracking-wide text-gray-400">Signups</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{performance.funnel.totalSignups}</p>
        </Card>
        <Card padding="md">
          <p className="text-xs uppercase tracking-wide text-gray-400">Activated</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{performance.funnel.totalActivated}</p>
        </Card>
        <Card padding="md">
          <p className="text-xs uppercase tracking-wide text-gray-400">Revenue</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            ${performance.funnel.totalRevenueValue.toFixed(0)}
          </p>
        </Card>
      </div>

      <Card padding="md">
        <h2 className="text-lg font-bold text-gray-900">Pending review</h2>
        <p className="mt-1 text-sm text-gray-500">
          Twitter, Reddit, and other higher-risk content stays in human review even for the system site.
        </p>
        <div className="mt-4">
          <SelfMarketingReviewPanel items={pendingReview} />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card padding="md">
          <h2 className="text-lg font-bold text-gray-900">Top performing self-marketing content</h2>
          <div className="mt-4 space-y-3">
            {performance.topContent.slice(0, 5).map((item) => (
              <div key={item.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                  <Badge variant="info" className="capitalize">{item.channel}</Badge>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {item.clicks || 0} clicks • {item.conversions || 0} signups • {item.activated || 0} activated • ${(item.revenueValue || 0).toFixed(0)} revenue
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="md">
          <h2 className="text-lg font-bold text-gray-900">Funnel snapshot</h2>
          <div className="mt-4 space-y-3">
            {[
              ["Clicks", performance.funnel.totalClicks],
              ["Signups", performance.funnel.totalSignups],
              ["Onboarding complete", performance.funnel.totalOnboardingComplete],
              ["Activated", performance.funnel.totalActivated],
              ["Paid", performance.funnel.totalRevenueEvents],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                <p className="text-sm text-gray-600">{label}</p>
                <p className="text-sm font-semibold text-gray-900">{value}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
