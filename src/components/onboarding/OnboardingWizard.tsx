"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, cn } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { getOnboardingConfig } from "@/lib/onboarding";
import { ContentItem, GrowthSurface, OnboardingPersona, SiteOnboardingState } from "@/types";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  RocketLaunchIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

interface OnboardingWizardProps {
  siteId: string;
  persona: OnboardingPersona;
  onboarding: SiteOnboardingState | null | undefined;
  surfaces: GrowthSurface[];
  initialQueueItems: ContentItem[];
  initialApprovedCount: number;
}

type WizardStep = 0 | 1 | 2;

function updateSteps(
  onboarding: SiteOnboardingState | null | undefined,
  additions: string[],
  extras?: Partial<SiteOnboardingState>
) {
  const steps = Array.from(new Set([...(onboarding?.steps_completed || []), ...additions]));
  return {
    ...onboarding,
    ...extras,
    steps_completed: steps,
  } as SiteOnboardingState;
}

export function OnboardingWizard({
  siteId,
  persona,
  onboarding,
  surfaces: initialSurfaces,
  initialQueueItems,
  initialApprovedCount,
}: OnboardingWizardProps) {
  const { toast } = useToast();
  const config = useMemo(() => getOnboardingConfig(persona), [persona]);
  const [open, setOpen] = useState(!(onboarding?.wizard_completed ?? false));
  const [step, setStep] = useState<WizardStep>(0);
  const [surfaces, setSurfaces] = useState(initialSurfaces);
  const [queueItems, setQueueItems] = useState(initialQueueItems.slice(0, 3));
  const [approvedCount, setApprovedCount] = useState(initialApprovedCount);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSurfaces(initialSurfaces);
  }, [initialSurfaces]);

  if (!open) return null;

  async function persistOnboarding(next: SiteOnboardingState) {
    const res = await fetch(`/api/sites/${siteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ onboarding_json: next }),
    });
    if (!res.ok) throw new Error("Failed to update onboarding state");
  }

  async function toggleSurface(surface: GrowthSurface) {
    setLoading(true);
    try {
      const nextStatus = surface.status === "active" ? "paused" : "active";
      const res = await fetch(`/api/sites/${siteId}/surfaces`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surfaceId: surface.id,
          status: nextStatus,
          priority: surface.priority,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Failed to update surfaces");
      setSurfaces(payload.surfaces || []);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to update surface.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function ensurePlanAndQueue() {
    setLoading(true);
    try {
      const planRes = await fetch(`/api/sites/${siteId}/plan`);
      const planPayload = await planRes.json();
      let planId = planPayload?.plan?.id as string | undefined;

      if (!planId) {
        const generateRes = await fetch("/api/generate-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ site_id: siteId }),
        });
        const generatePayload = await generateRes.json().catch(() => ({}));
        if (!generateRes.ok) {
          throw new Error(generatePayload.error || "Failed to generate plan");
        }
        planId = generatePayload.plan_id;
      }

      if (planId) {
        await fetch("/api/bulk-generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan_id: planId }),
        });
      }

      const queueRes = await fetch(`/api/sites/${siteId}/queue?status=draft&page=1&limit=3`);
      const queuePayload = await queueRes.json().catch(() => ({}));
      if (queueRes.ok) {
        setQueueItems((queuePayload.items || []).slice(0, 3));
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(item: ContentItem) {
    setLoading(true);
    try {
      const res = await fetch("/api/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_item_id: item.id }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Failed to approve content");

      const nextApproved = approvedCount + 1;
      setApprovedCount(nextApproved);
      setQueueItems((current) => current.filter((candidate) => candidate.id !== item.id));

      const nextOnboarding = updateSteps(onboarding, ["content_approved"], {
        wizard_completed: queueItems.length <= 1,
        completed_at: queueItems.length <= 1 ? new Date().toISOString() : onboarding?.completed_at || null,
      });
      await persistOnboarding(nextOnboarding);

      if (queueItems.length <= 1) {
        toast("First wins unlocked. LaunchPilot is now working in the background.", "success");
        setOpen(false);
        window.location.reload();
      } else {
        toast("Content approved.", "success");
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to approve content.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleContinue() {
    if (step === 0) {
      try {
        await persistOnboarding(updateSteps(onboarding, ["surfaces_activated"]));
      } catch {
        toast("Failed to persist surface setup.", "error");
        return;
      }
      setStep(1);
      return;
    }

    if (step === 1) {
      setStep(2);
      if (queueItems.length === 0) {
        await ensurePlanAndQueue();
      }
      return;
    }
  }

  async function handleSkip() {
    try {
      await persistOnboarding(
        updateSteps(onboarding, [], {
          wizard_completed: true,
          completed_at: new Date().toISOString(),
        })
      );
      setOpen(false);
      toast("Onboarding skipped. You can still finish setup from the dashboard.", "info");
    } catch {
      toast("Failed to skip onboarding.", "error");
    }
  }

  const activeSurfaces = surfaces.filter((surface) => surface.status === "active");
  const setupActions = [
    {
      title: config.suggestedSurfaces.includes("founder_social") ? "Connect Twitter" : "Review settings",
      description:
        config.suggestedSurfaces.includes("founder_social")
          ? "Unlock faster publishing and self-marketing loops."
          : "Open settings and review the recommended integrations.",
      href: `/sites/${siteId}/settings`,
    },
    {
      title: "Install tracking pixel",
      description: "Make sure LaunchPilot can measure the traffic and signups it creates.",
      href: `/sites/${siteId}/settings`,
    },
    {
      title: "Review your first queue",
      description: "LaunchPilot will tee up content once your plan is ready.",
      href: `/sites/${siteId}/queue`,
    },
  ];

  return (
    <Card padding="lg" className="border-brand-200 bg-gradient-to-br from-brand-50 via-white to-orange-50">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-700 shadow-sm">
            <SparklesIcon className="h-4 w-4" />
            Adaptive onboarding
          </div>
          <h2 className="mt-4 text-xl font-bold text-gray-900">Your first 5 minutes with LaunchPilot</h2>
          <p className="mt-2 max-w-2xl text-sm text-gray-600">{config.welcomeMessage}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSkip}>
          Skip for now
        </Button>
      </div>

      <div className="mt-6 flex gap-2">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className={cn(
              "h-2 flex-1 rounded-full",
              index <= step ? "bg-brand-500" : "bg-gray-200"
            )}
          />
        ))}
      </div>

      {step === 0 && (
        <div className="mt-6 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Step 1</p>
            <h3 className="mt-1 text-lg font-semibold text-gray-900">
              We’ve identified you as a {persona.replace(/_/g, " ")}
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              LaunchPilot pre-activated the most relevant growth surfaces for this persona. Adjust anything before the first plan is generated.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {surfaces.map((surface) => {
              const suggested = config.suggestedSurfaces.includes(surface.surface_type);
              return (
                <div key={surface.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900">{surface.display_name}</p>
                        {suggested && <Badge variant="info">Suggested</Badge>}
                        {!surface.execution_ready && <Badge variant="warning">Guidance only</Badge>}
                      </div>
                      <p className="mt-2 text-sm text-gray-600">{surface.rationale}</p>
                    </div>
                    <Button
                      variant={surface.status === "active" ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => toggleSurface(surface)}
                      disabled={loading}
                    >
                      {surface.status === "active" ? "Active" : "Activate"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Active right now</p>
              <p className="text-xs text-gray-500">{activeSurfaces.length} surfaces will shape the first plan</p>
            </div>
            <Button onClick={handleContinue} disabled={loading}>
              Continue <ArrowRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="mt-6 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Step 2</p>
            <h3 className="mt-1 text-lg font-semibold text-gray-900">Quick setup</h3>
            <p className="mt-2 text-sm text-gray-600">
              LaunchPilot only needs a few setup steps before it can start shipping and learning.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {setupActions.map((action) => (
              <Link key={action.title} href={action.href} className="block">
                <div className="h-full rounded-2xl border border-gray-200 bg-white p-4 transition-colors hover:border-brand-300 hover:bg-brand-50/40">
                  <p className="text-sm font-semibold text-gray-900">{action.title}</p>
                  <p className="mt-2 text-sm text-gray-600">{action.description}</p>
                </div>
              </Link>
            ))}
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-sm font-semibold text-emerald-900">Quick wins for this persona</p>
            <ul className="mt-2 space-y-1 text-sm text-emerald-800">
              {config.quickWins.map((win) => (
                <li key={win}>• {win}</li>
              ))}
            </ul>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleContinue} disabled={loading}>
              Show my first wins <RocketLaunchIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="mt-6 space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Step 3</p>
              <h3 className="mt-1 text-lg font-semibold text-gray-900">Your first wins</h3>
              <p className="mt-2 text-sm text-gray-600">
                Approve these and LaunchPilot starts working for you today.
              </p>
            </div>
            {queueItems.length === 0 && (
              <Button onClick={ensurePlanAndQueue} loading={loading}>
                Generate first batch
              </Button>
            )}
          </div>

          {queueItems.length > 0 ? (
            <div className="grid gap-3">
              {queueItems.map((item) => (
                <div key={item.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="info" className="capitalize">
                          {item.channel}
                        </Badge>
                        {item.variant_label && <Badge variant="warning">{item.variant_label}</Badge>}
                      </div>
                      <p className="mt-2 text-sm font-semibold text-gray-900">{item.title}</p>
                      <p className="mt-2 text-sm text-gray-600 line-clamp-4 whitespace-pre-wrap">
                        {item.body || "Content is being generated for this action item."}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(item)}
                      disabled={loading || !item.body}
                    >
                      <CheckCircleIcon className="h-4 w-4" />
                      Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
              LaunchPilot will generate a first batch from your active surfaces when you click the button above.
            </div>
          )}

          <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Approved so far</p>
              <p className="text-xs text-gray-500">
                {approvedCount} piece{approvedCount === 1 ? "" : "s"} approved
              </p>
            </div>
            <Link href={`/sites/${siteId}/queue`}>
              <Button variant="outline" size="sm">
                Open full queue
              </Button>
            </Link>
          </div>
        </div>
      )}
    </Card>
  );
}
