import { redirect } from "next/navigation";
import { getUser, getSupabaseServerClient } from "@/lib/supabase";
import { Card, Badge, Button } from "@/components/ui";
import { EditProfileName } from "@/components/dashboard/EditProfileName";
import { PRICING_PLANS } from "@/lib/stripe";
import Link from "next/link";
import { CheckIcon } from "@heroicons/react/24/solid";

export default async function SettingsPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = getSupabaseServerClient();

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*, companies(*)")
    .eq("id", user.id)
    .single();

  const currentPlan = PRICING_PLANS.find((p) => p.id === profile?.subscription_tier) || PRICING_PLANS[0];

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Account, billing, and preferences</p>
      </div>

      {/* Account */}
      <Card padding="md">
        <h2 className="font-bold text-gray-900 mb-4">Account</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-gray-50">
            <span className="text-sm text-gray-500">Email</span>
            <span className="text-sm font-medium text-gray-900">{user.email}</span>
          </div>
          <EditProfileName currentName={profile?.name || ""} />
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-500">Role</span>
            <Badge variant="purple" className="capitalize">{profile?.role}</Badge>
          </div>
        </div>
      </Card>

      {/* Billing */}
      <Card padding="md">
        <h2 className="font-bold text-gray-900 mb-4">Current Plan</h2>
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="font-semibold text-gray-900 text-lg">{currentPlan.name}</p>
            <p className="text-gray-500 text-sm">{currentPlan.description}</p>
            {profile?.trial_ends_at && (
              <p className="text-amber-600 text-sm font-medium mt-1">
                Free trial ends {new Date(profile.trial_ends_at).toLocaleDateString("en-US", { month: "long", day: "numeric" })}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">${currentPlan.price}<span className="text-sm font-normal text-gray-400">/mo</span></p>
          </div>
        </div>

        <ul className="space-y-2 mb-6">
          {currentPlan.features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
              <CheckIcon className="w-4 h-4 text-emerald-500" />
              {f}
            </li>
          ))}
        </ul>

        <div className="flex gap-3">
          <Link href="/settings/billing">
            <Button variant="outline" size="sm">Manage billing</Button>
          </Link>
          {profile?.subscription_tier !== "agency" && (
            <Link href="/settings/billing">
              <Button size="sm">Upgrade plan</Button>
            </Link>
          )}
        </div>
      </Card>

      {/* Available plans */}
      <div>
        <h2 className="font-bold text-gray-900 mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 gap-4">
          {PRICING_PLANS.map((plan) => (
            <Card key={plan.id} padding="md" className={plan.id === profile?.subscription_tier ? "border-brand-300" : ""}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">{plan.name}</p>
                    {plan.id === profile?.subscription_tier && <Badge variant="purple">Current</Badge>}
                    {plan.highlighted && plan.id !== profile?.subscription_tier && <Badge variant="info">Popular</Badge>}
                  </div>
                  <p className="text-sm text-gray-500">{plan.features.slice(0, 2).join(" · ")}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-900">${plan.price}/mo</span>
                  {plan.id !== profile?.subscription_tier && (
                    <Link href={`/settings/billing?plan=${plan.id}`}>
                      <Button size="sm" variant={plan.highlighted ? "primary" : "outline"}>
                        Switch
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
