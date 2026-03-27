"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Card, Badge } from "@/components/ui";
import { PRICING_PLANS } from "@/lib/stripe";
import { CheckIcon } from "@heroicons/react/24/solid";

export default function BillingPage() {
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");
  const planParam = searchParams.get("plan");

  const [loading, setLoading] = useState<string | null>(null);

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

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your subscription</p>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-800 font-medium">
          🎉 Subscription activated! You're all set.
        </div>
      )}
      {canceled && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-600">
          Checkout canceled. Your plan was not changed.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PRICING_PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`bg-white rounded-2xl border p-6 ${
              plan.highlighted
                ? "border-brand-400 ring-2 ring-brand-100"
                : "border-gray-100"
            }`}
          >
            {plan.highlighted && (
              <div className="inline-block px-2 py-0.5 bg-brand-500 text-white text-xs font-bold rounded-full mb-3">
                POPULAR
              </div>
            )}
            <h3 className="text-lg font-bold text-gray-900 mb-1">{plan.name}</h3>
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-3xl font-black text-gray-900">${plan.price}</span>
              <span className="text-gray-400 text-sm">/mo</span>
            </div>
            <ul className="space-y-2 mb-6">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                  <CheckIcon className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <Button
              variant={plan.highlighted ? "primary" : "outline"}
              className="w-full"
              onClick={() => handleCheckout(plan.id)}
              loading={loading === plan.id}
            >
              {plan.id === "growth" ? "Start 7-Day Trial" : `Choose ${plan.name}`}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
