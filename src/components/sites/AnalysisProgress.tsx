"use client";

import { useEffect, useState } from "react";
import { CheckCircleIcon, ExclamationCircleIcon } from "@heroicons/react/24/solid";
import { cn } from "@/components/ui";

export interface ProgressStep {
  id: string;
  label: string;
  status: "pending" | "running" | "done" | "error";
}

const DEFAULT_STEPS: ProgressStep[] = [
  { id: "fetch", label: "Crawling your site...", status: "pending" },
  { id: "extract", label: "Extracting product information...", status: "pending" },
  { id: "customer", label: "Identifying your target customer...", status: "pending" },
  { id: "competitive", label: "Analyzing the competitive landscape...", status: "pending" },
  { id: "strategy", label: "Building your marketing strategy...", status: "pending" },
  { id: "plan", label: "Generating your content plan...", status: "pending" },
];

interface AnalysisProgressProps {
  steps?: ProgressStep[];
  currentStep?: number;
}

export function AnalysisProgress({ steps = DEFAULT_STEPS, currentStep = 0 }: AnalysisProgressProps) {
  const [visibleSteps, setVisibleSteps] = useState<ProgressStep[]>([]);

  useEffect(() => {
    setVisibleSteps([]);
    // Reveal steps one by one with a slight delay for animation
    const timeouts = steps.map((step, i) =>
      setTimeout(() => {
        setVisibleSteps((prev) => [...prev, step]);
      }, i * 80)
    );
    return () => timeouts.forEach(clearTimeout);
  }, [steps]);

  const displaySteps = steps.map((step, i) => ({
    ...step,
    status: i < currentStep ? "done" : i === currentStep ? "running" : "pending",
  }));

  return (
    <div className="space-y-3">
      {displaySteps.map((step, i) => {
        const isVisible = visibleSteps.some((s) => s.id === step.id);
        return (
          <div
            key={step.id}
            className={cn(
              "flex items-center gap-3 transition-all duration-500",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            )}
            style={{ transitionDelay: `${i * 80}ms` }}
          >
            {/* Status icon */}
            <div className="flex-shrink-0">
              {step.status === "done" ? (
                <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
              ) : step.status === "error" ? (
                <ExclamationCircleIcon className="w-5 h-5 text-red-500" />
              ) : step.status === "running" ? (
                <div className="w-5 h-5 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-gray-200" />
              )}
            </div>

            {/* Label */}
            <span
              className={cn(
                "text-sm font-medium transition-colors",
                step.status === "done" && "text-gray-500",
                step.status === "running" && "text-gray-900",
                step.status === "pending" && "text-gray-400",
                step.status === "error" && "text-red-500"
              )}
            >
              {step.label}
            </span>

            {/* Running indicator */}
            {step.status === "running" && (
              <span className="animate-pulse-soft text-xs text-brand-500 font-medium">
                Working...
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Animated URL analysis box ──────────────────────────────────────
export function AnalysisCard({ url, currentStep }: { url: string; currentStep: number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-8 max-w-md w-full animate-slide-up">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-50 text-brand-600 rounded-full text-xs font-semibold mb-4">
          <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
          Analyzing
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">LaunchPilot is reading your site</h2>
        <p className="text-sm text-gray-500 font-mono truncate">{url}</p>
      </div>
      <AnalysisProgress currentStep={currentStep} />
    </div>
  );
}
