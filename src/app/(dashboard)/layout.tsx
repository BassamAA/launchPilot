import { redirect } from "next/navigation";
import { getUser, getSupabaseServerClient } from "@/lib/supabase";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import { MobileNav } from "@/components/dashboard/MobileNav";
import { ToastProvider } from "@/components/ui/Toast";
import { Site } from "@/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = getSupabaseServerClient();

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("company_id, name, avatar_url, subscription_tier")
    .eq("id", user.id)
    .single();

  // First-time user with no profile — send to onboarding
  if (!profile) {
    redirect("/onboarding");
  }

  let sites: Site[] = [];
  let pendingCountBySite: Record<string, number> = {};
  if (profile.company_id) {
    const [{ data: sitesData }, { data: pendingData }] = await Promise.all([
      supabase
        .from("sites")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: true }),
      supabase
        .from("content_items")
        .select("site_id")
        .eq("status", "draft")
        .neq("body", ""),
    ]);
    sites = (sitesData as Site[]) || [];
    for (const item of pendingData || []) {
      pendingCountBySite[item.site_id] = (pendingCountBySite[item.site_id] || 0) + 1;
    }
  }

  const userInfo = {
    name: profile.name,
    email: user.email,
    avatar_url: profile.avatar_url,
    subscription_tier: profile.subscription_tier,
  };

  return (
    <ToastProvider>
      <div className="flex h-screen bg-[#f8fafc] overflow-hidden">
        {/* Desktop sidebar */}
        <div className="hidden md:block">
          <Sidebar sites={sites} pendingCountBySite={pendingCountBySite} />
        </div>
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Mobile top bar — hamburger + user controls in one row */}
          <div className="flex items-center h-14 border-b border-gray-100 bg-white px-4 flex-shrink-0 md:hidden">
            <MobileNav sites={sites} pendingCountBySite={pendingCountBySite} />
            <div className="flex-1" />
            <TopBar user={userInfo} compact />
          </div>
          {/* Desktop top bar */}
          <div className="hidden md:block">
            <TopBar user={userInfo} />
          </div>
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">{children}</div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
