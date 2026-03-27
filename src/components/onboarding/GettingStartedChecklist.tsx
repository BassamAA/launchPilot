"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { getChecklistSteps, getOnboardingConfig } from "@/lib/onboarding";
import { OnboardingPersona, SiteOnboardingState } from "@/types";
import { CheckCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface ChecklistItem {
  key: string;
  label: string;
  href?: string;
  done: boolean;
  visible: boolean;
}

interface GettingStartedChecklistProps {
  siteId: string;
  persona: OnboardingPersona;
  onboarding: SiteOnboardingState | null | undefined;
  briefConfirmed: boolean;
  activeSurfaceCount: number;
  twitterConnected: boolean;
  approvedCount: number;
  hasTrackingActivity: boolean;
  canReviewPerformance: boolean;
}

export function GettingStartedChecklist({
  siteId,
  persona,
  onboarding,
  briefConfirmed,
  activeSurfaceCount,
  twitterConnected,
  approvedCount,
  hasTrackingActivity,
  canReviewPerformance,
}: GettingStartedChecklistProps) {
  const { toast } = useToast();
  const config = useMemo(() => getOnboardingConfig(persona), [persona]);
  const [dismissed, setDismissed] = useState(Boolean(onboarding?.checklist_dismissed));
  const persistedSteps = getChecklistSteps(onboarding);

  const items = useMemo<ChecklistItem[]>(() => {
    const showTwitter = config.suggestedSurfaces.includes("founder_social");
    return [
      {
        key: "brief_confirmed",
        label: "Confirm your marketing brief",
        href: `/sites/${siteId}/brief`,
        done: briefConfirmed || persistedSteps.has("brief_confirmed"),
        visible: true,
      },
      {
        key: "surfaces_activated",
        label: "Activate growth surfaces",
        href: `/sites/${siteId}/surfaces`,
        done: activeSurfaceCount > 0 || persistedSteps.has("surfaces_activated"),
        visible: true,
      },
      {
        key: "twitter_connected",
        label: "Connect Twitter",
        href: `/sites/${siteId}/settings`,
        done: twitterConnected || persistedSteps.has("twitter_connected"),
        visible: showTwitter,
      },
      {
        key: "content_approved",
        label: "Approve your first 5 content items",
        href: `/sites/${siteId}/queue`,
        done: approvedCount >= 5 || persistedSteps.has("content_approved"),
        visible: true,
      },
      {
        key: "tracking_installed",
        label: "Install tracking pixel",
        href: `/sites/${siteId}/settings`,
        done: hasTrackingActivity || persistedSteps.has("tracking_installed"),
        visible: true,
      },
      {
        key: "performance_reviewed",
        label: "Review your first performance report",
        href: `/sites/${siteId}/performance`,
        done: canReviewPerformance || persistedSteps.has("performance_reviewed"),
        visible: true,
      },
    ];
  }, [activeSurfaceCount, approvedCount, briefConfirmed, canReviewPerformance, config.suggestedSurfaces, hasTrackingActivity, persistedSteps, siteId, twitterConnected]);

  if (dismissed) return null;

  const completed = items.filter((item) => item.visible && item.done).length;
  const total = items.filter((item) => item.visible).length;

  async function dismiss() {
    try {
      const next = {
        ...(onboarding || {}),
        checklist_dismissed: true,
      };
      const res = await fetch(`/api/sites/${siteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboarding_json: next }),
      });
      if (!res.ok) throw new Error("Failed to dismiss checklist");
      setDismissed(true);
    } catch {
      toast("Failed to dismiss checklist.", "error");
    }
  }

  return (
    <Card padding="md" className="border-emerald-200 bg-emerald-50/60">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-gray-900">Getting Started</h3>
            <Badge variant="success">
              {completed}/{total}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Complete the essentials and LaunchPilot’s automation will have enough context to start compounding.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={dismiss}>
          <XMarkIcon className="h-4 w-4" />
          Dismiss
        </Button>
      </div>

      <div className="mt-4 space-y-3">
        {items.filter((item) => item.visible).map((item) => {
          const row = (
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/80 bg-white px-4 py-3">
              <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${item.done ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-400"}`}>
                  <CheckCircleIcon className="h-4 w-4" />
                </div>
                <div>
                  <p className={`text-sm font-semibold ${item.done ? "text-gray-900" : "text-gray-700"}`}>{item.label}</p>
                  <p className="text-xs text-gray-400">{item.done ? "Completed" : "Recommended next step"}</p>
                </div>
              </div>
              {item.href && !item.done && (
                <Link href={item.href}>
                  <Button size="sm" variant="outline">
                    Open
                  </Button>
                </Link>
              )}
            </div>
          );
          return <div key={item.key}>{row}</div>;
        })}
      </div>
    </Card>
  );
}
