import { redirect, notFound } from "next/navigation";
import { buildPersonaSummary } from "@/lib/onboarding";
import { getUser, getSupabaseServerClient } from "@/lib/supabase";
import { ContentItem, Site } from "@/types";
import { ContentLibrary } from "@/components/content/ContentLibrary";

export default async function ContentPage({ params }: { params: { id: string } }) {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = getSupabaseServerClient();

  const { data: items, error } = await supabase
    .from("content_items")
    .select("*")
    .eq("site_id", params.id)
    .order("scheduled_date", { ascending: true });

  const { data: site } = await supabase
    .from("sites")
    .select("brief_json, business_profile_json, sources_json, onboarding_json")
    .eq("id", params.id)
    .single();

  if (error) notFound();
  const { persona } = buildPersonaSummary((site || {}) as Pick<Site, "brief_json" | "business_profile_json" | "sources_json" | "onboarding_json">);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">All Content</h1>
        <p className="mt-1 text-sm text-gray-500">
          Browse everything for this site here. Posting and completion now happen in Queue.
        </p>
      </div>

      <ContentLibrary siteId={params.id} items={(items || []) as ContentItem[]} persona={persona} />
    </div>
  );
}
