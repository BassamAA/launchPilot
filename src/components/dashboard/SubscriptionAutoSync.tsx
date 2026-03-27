"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Fires on mount when the user's tier shows as free_trial but they may have
 * a live Stripe subscription (webhook lag or prior bug). Syncs once and
 * refreshes the page if the tier changes.
 */
export function SubscriptionAutoSync({ tier }: { tier?: string }) {
  const router = useRouter();

  useEffect(() => {
    if (tier !== "free_trial") return;
    let cancelled = false;

    async function sync() {
      try {
        const res = await fetch("/api/stripe/sync", { method: "POST" });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (data.tier && data.tier !== "free_trial") {
          router.refresh();
        }
      } catch {
        // silent — non-critical
      }
    }

    sync();
    return () => { cancelled = true; };
  }, [tier, router]);

  return null;
}
