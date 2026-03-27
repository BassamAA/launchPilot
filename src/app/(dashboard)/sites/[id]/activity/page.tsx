import { redirect, notFound } from "next/navigation";
import { getUser, getSupabaseServerClient } from "@/lib/supabase";
import { ActivityLog } from "@/types";
import { Card } from "@/components/ui";
import { BRAND_NAME } from "@/lib/brand";

const ACTION_ICONS: Record<string, string> = {
  site_analyzed: "🔍",
  brief_confirmed: "✅",
  plan_generated: "📅",
  bulk_generated: "⚡",
  content_approved: "👍",
  content_rejected: "❌",
  content_published: "🚀",
};

export default async function ActivityPage({ params }: { params: { id: string } }) {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = getSupabaseServerClient();

  const { data } = await supabase
    .from("activity_log")
    .select("*")
    .eq("site_id", params.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const activities = (data || []) as ActivityLog[];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Activity Feed</h1>
        <p className="text-gray-500 text-sm mt-1">Everything {BRAND_NAME} has done for this site</p>
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p>No activity yet</p>
        </div>
      ) : (
        <Card padding="none">
          <ul className="divide-y divide-gray-50">
            {activities.map((entry) => (
              <li key={entry.id} className="flex items-start gap-4 p-4">
                <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-lg flex-shrink-0">
                  {ACTION_ICONS[entry.action] || "📌"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 font-medium">{entry.description}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(entry.created_at).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  {entry.metadata_json && Object.keys(entry.metadata_json).length > 0 && (
                    <div className="mt-2 bg-gray-50 rounded-lg px-3 py-2 text-xs font-mono text-gray-500">
                      {JSON.stringify(entry.metadata_json, null, 0)
                        .replace(/[{}"]/g, "")
                        .replace(/,/g, " · ")
                        .replace(/:/g, ": ")
                        .slice(0, 120)}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
