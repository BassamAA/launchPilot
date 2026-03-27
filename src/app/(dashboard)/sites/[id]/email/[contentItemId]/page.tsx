import { notFound, redirect } from "next/navigation";
import { Badge, Card } from "@/components/ui";
import { EmailCampaignComposer } from "@/components/sites/EmailCampaignComposer";
import { getSupabaseServerClient, getUser } from "@/lib/supabase";
import { ContentItem } from "@/types";

export default async function EmailCampaignPage({
  params,
}: {
  params: { id: string; contentItemId: string };
}) {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = getSupabaseServerClient();
  const { data: item } = await supabase
    .from("content_items")
    .select("*")
    .eq("id", params.contentItemId)
    .eq("site_id", params.id)
    .single();

  if (!item || item.channel !== "email") notFound();

  const { data: emailSettings } = await supabase
    .from("platform_connections")
    .select("metadata_json")
    .eq("site_id", params.id)
    .eq("platform", "email")
    .single();

  const { data: sendStats } = await supabase
    .from("email_sends")
    .select("status")
    .eq("content_item_id", params.contentItemId);

  const stats = (sendStats || []).reduce<Record<string, number>>((acc, send) => {
    acc[send.status] = (acc[send.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{item.title}</h1>
            <Badge variant="purple">Email Campaign</Badge>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Review recipients, send a test, then launch the campaign.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            ["Sent", stats.sent || 0],
            ["Delivered", stats.delivered || 0],
            ["Opened", stats.opened || 0],
            ["Clicked", stats.clicked || 0],
          ].map(([label, value]) => (
            <Card key={label} padding="sm" className="min-w-[120px]">
              <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
              <p className="mt-1 text-xl font-bold text-gray-900">{value}</p>
            </Card>
          ))}
        </div>
      </div>

      <EmailCampaignComposer
        item={item as ContentItem}
        siteId={params.id}
        emailSettings={(emailSettings?.metadata_json || {}) as Record<string, unknown>}
      />
    </div>
  );
}
