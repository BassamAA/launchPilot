"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { MarketingBriefCard } from "@/components/sites/MarketingBriefCard";
import { Spinner, Button, EmptyState } from "@/components/ui";
import { MarketingBrief, Site } from "@/types";
import { DocumentTextIcon, ArrowRightIcon } from "@heroicons/react/24/outline";

export default function BriefPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.id as string;

  const [site, setSite] = useState<Site | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/sites/${siteId}`)
      .then((r) => r.json())
      .then((data) => {
        setSite(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load brief. Please refresh.");
        setLoading(false);
      });
  }, [siteId]);

  async function handleConfirm(brief: MarketingBrief) {
    setConfirming(true);
    setError("");
    try {
      const res = await fetch(`/api/sites/${siteId}/confirm-brief`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief }),
      });
      if (!res.ok) throw new Error("Failed to confirm brief");
      router.push(`/sites/${siteId}/plan`);
    } catch {
      setError("Failed to save. Please try again.");
      setConfirming(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (error && !site) {
    return (
      <EmptyState
        icon={<DocumentTextIcon className="w-16 h-16" />}
        title="Couldn&apos;t load brief"
        description={error}
        action={<Button onClick={() => window.location.reload()}>Try again</Button>}
      />
    );
  }

  if (!site?.brief_json) {
    return (
      <EmptyState
        icon={<DocumentTextIcon className="w-16 h-16" />}
        title="No brief yet"
        description="Analyze your site first to generate a marketing brief."
        action={<Button onClick={() => router.push(`/sites/${siteId}`)}>Back to dashboard</Button>}
      />
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-600">Brief</p>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Confirm the strategy foundation</h1>
        <p className="mt-2 text-sm text-gray-500 max-w-2xl">
          This brief shapes your plan, drafts, and queue. Fix anything clearly wrong, then confirm it and move forward.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <MarketingBriefCard
        brief={site.brief_json}
        onConfirm={handleConfirm}
        isConfirmed={site.brief_confirmed}
        loading={confirming}
        sourcesJson={site.sources_json}
      />

      {site.brief_confirmed && (
        <div className="mt-2 flex justify-end">
          <Button onClick={() => router.push(`/sites/${siteId}/plan`)} size="lg">
            Continue to plan <ArrowRightIcon className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
