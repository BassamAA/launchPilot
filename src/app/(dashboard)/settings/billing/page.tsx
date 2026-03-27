"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Badge } from "@/components/ui";
import { PRICING_PLANS } from "@/lib/stripe";
import { CheckIcon } from "@heroicons/react/24/solid";

interface UserBillingData {
  subscription_tier: string;
  trial_ends_at: string | null;
  content_used_this_month: number;
}

export default function BillingPage() {
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  const [loading, setLoading] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [billingData, setBillingData] = useState<UserBillingData | null>(null);

  async function loadBillingData() {
    const d = await fetch("/api/stripe/billing-status").then((r) => r.json()).catch(() => null);
    if (d) setBillingData(d);
    return d;
  }

  useEffect(() => {
    if (success) {
      // Stripe redirects here before the webhook fires — sync immediately
      fetch("/api/stripe/sync", { method: "POST" })
        .then(() => loadBillingData())
        .catch(() => loadBillingData());
    } else {
      loadBillingData();
    }
  }, [success]);

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/stripe/sync", { method: "POST" });
      const data = await res.json();
      if (data.synced) {
        await loadBillingData();
      }
    } finally {
      setSyncing(false);
    }
  }

  async function handleCheckout(tier: string) {
    setLoading(tier);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(null);
    }
  }

  const currentTier = billingData?.subscription_tier || "free_trial";
  const currentPlan = PRICING_PLANS.find((p) => p.id === currentTier);
  const usedThisMonth = billingData?.content_used_this_month || 0;
  const monthlyLimit = currentPlan?.limits.content_per_month ?? 10;
  const isUnlimited = monthlyLimit === Infinity;
  const usagePercent = isUnlimited ? 0 : Math.min(100, Math.round((usedThisMonth / monthlyLimit) * 100));

  const isTrial = currentTier === "free_trial";

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your subscription</p>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-800 font-medium">
          {currentPlan && currentPlan.id !== "free_trial"
            ? `You're on the ${currentPlan.name} plan — all set.`
            : "Payment received — syncing your plan…"}
        </div>
      )}
      {canceled && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-600">
          Checkout canceled. Your plan was not changed.
        </div>
      )}

      {/* Current plan status */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Current plan</p>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900">
                {isTrial ? "Free Trial" : (currentPlan?.name ?? "Free Trial")}
              </h2>
              {isTrial && <Badge variant="warning">Trial</Badge>}
            </div>
            {isTrial && billingData?.trial_ends_at && (
              <p className="text-sm text-amber-600 mt-1">
                Expires {new Date(billingData.trial_ends_at).toLocaleDateString("en-US", { month: "long", day: "numeric" })} — upgrade to keep your content running
              </p>
            )}
            {!isTrial && currentPlan && (
              <p className="text-sm text-gray-500 mt-1">${currentPlan.price}/month</p>
            )}
          {isTrial && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="mt-2 text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 disabled:opacity-50"
            >
              {syncing ? "Checking…" : "Already paid? Sync your plan →"}
            </button>
          )}
          </div>
          {!isUnlimited && (
            <div className="text-right text-sm">
              <p className="font-semibold text-gray-900">{usedThisMonth} / {monthlyLimit}</p>
              <p className="text-gray-400 text-xs">content pieces this month</p>
            </div>
          )}
        </div>

        {!isUnlimited && (
          <div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${usagePercent >= 90 ? "bg-red-400" : usagePercent >= 70 ? "bg-amber-400" : "bg-emerald-400"}`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            {usagePercent >= 80 && (
              <p className="text-xs text-amber-600 mt-1.5">
                {usagePercent >= 100 ? "Monthly limit reached — upgrade to keep generating content." : `${monthlyLimit - usedThisMonth} pieces left this month.`}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Plans */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          {isTrial ? "Choose a plan to get started" : "Change plan"}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PRICING_PLANS.map((plan) => {
            const isCurrent = plan.id === currentTier;
            return (
              <div
                key={plan.id}
                className={`bg-white rounded-2xl border p-6 flex flex-col ${
                  plan.highlighted && !isCurrent
                    ? "border-brand-400 ring-2 ring-brand-100"
                    : isCurrent
                    ? "border-emerald-300 bg-emerald-50/30"
                    : "border-gray-100"
                }`}
              >
                <div className="mb-4">
                  {isCurrent ? (
                    <div className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full mb-2">
                      YOUR PLAN
                    </div>
                  ) : plan.highlighted ? (
                    <div className="inline-block px-2 py-0.5 bg-brand-500 text-white text-xs font-bold rounded-full mb-2">
                      MOST POPULAR
                    </div>
                  ) : null}
                  <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{plan.description}</p>
                  <div className="flex items-baseline gap-1 mt-3">
                    <span className="text-3xl font-black text-gray-900">${plan.price}</span>
                    <span className="text-gray-400 text-sm">/mo</span>
                  </div>
                </div>
                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckIcon className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <Button variant="outline" className="w-full" disabled>
                    Current plan
                  </Button>
                ) : (
                  <Button
                    variant={plan.highlighted ? "primary" : "outline"}
                    className="w-full"
                    onClick={() => handleCheckout(plan.id)}
                    loading={loading === plan.id}
                  >
                    {plan.id === "growth" && isTrial ? "Start 7-Day Trial" : `Switch to ${plan.name}`}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
