"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RocketLaunchIcon } from "@heroicons/react/24/solid";
import { BRAND_NAME } from "@/lib/brand";
import { AnalysisProgress, ProgressStep } from "@/components/sites/AnalysisProgress";
import { MarketingBriefCard } from "@/components/sites/MarketingBriefCard";
import { MarketingBrief } from "@/types";

const TIMEZONES = [
  { value: "UTC", label: "UTC — Coordinated Universal Time" },
  { value: "America/New_York", label: "Eastern Time — New York" },
  { value: "America/Chicago", label: "Central Time — Chicago" },
  { value: "America/Denver", label: "Mountain Time — Denver" },
  { value: "America/Los_Angeles", label: "Pacific Time — Los Angeles" },
  { value: "America/Toronto", label: "Eastern Time — Toronto" },
  { value: "America/Vancouver", label: "Pacific Time — Vancouver" },
  { value: "America/Sao_Paulo", label: "Brasília Time — São Paulo" },
  { value: "Europe/London", label: "GMT — London" },
  { value: "Europe/Paris", label: "Central European Time — Paris" },
  { value: "Europe/Berlin", label: "Central European Time — Berlin" },
  { value: "Europe/Amsterdam", label: "Central European Time — Amsterdam" },
  { value: "Europe/Stockholm", label: "Central European Time — Stockholm" },
  { value: "Asia/Dubai", label: "Gulf Standard Time — Dubai" },
  { value: "Asia/Kolkata", label: "India Standard Time — Mumbai" },
  { value: "Asia/Singapore", label: "Singapore Standard Time" },
  { value: "Asia/Tokyo", label: "Japan Standard Time — Tokyo" },
  { value: "Asia/Shanghai", label: "China Standard Time — Shanghai" },
  { value: "Asia/Seoul", label: "Korea Standard Time — Seoul" },
  { value: "Australia/Sydney", label: "Australian Eastern Time — Sydney" },
  { value: "Australia/Melbourne", label: "Australian Eastern Time — Melbourne" },
  { value: "Pacific/Auckland", label: "New Zealand Standard Time — Auckland" },
];

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function OnboardingPageClient({ prefillUrl = "" }: { prefillUrl?: string }) {
  const router = useRouter();

  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState(prefillUrl);
  const [description, setDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [submittingWorkspace, setSubmittingWorkspace] = useState(false);
  const [analysisProgressSteps, setAnalysisProgressSteps] = useState<ProgressStep[]>([]);
  const [analysisCurrentStep, setAnalysisCurrentStep] = useState(0);
  const [brief, setBrief] = useState<MarketingBrief | null>(null);
  const [siteId, setSiteId] = useState<string>("");
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [error, setError] = useState("");
  const [startedAnalysis, setStartedAnalysis] = useState(false);

  const formValid = companyName.trim().length > 0 && description.trim().length > 0;

  async function startWorkspaceAndAnalysis() {
    if (!formValid || submittingWorkspace) return;

    setSubmittingWorkspace(true);
    setError("");
    setBrief(null);
    setStartedAnalysis(false);

    try {
      const workspaceRes = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_name: companyName.trim(), timezone }),
      });

      if (!workspaceRes.ok) {
        const data = await workspaceRes.json().catch(() => ({}));
        setError(data.error || "Failed to create workspace.");
        setSubmittingWorkspace(false);
        return;
      }

      setStartedAnalysis(true);

      const steps: ProgressStep[] = [
        { id: "website", label: "Reading your website...", status: "pending" },
        { id: "signals", label: "Understanding your product and audience...", status: "pending" },
        { id: "positioning", label: "Building your positioning and channel priorities...", status: "pending" },
        { id: "brief", label: "Generating your marketing brief...", status: "pending" },
      ];

      setAnalysisProgressSteps(steps);
      setAnalysisCurrentStep(0);

      const stepTimings = steps.map((_, i) => 800 + i * 1300);
      const timers = stepTimings.map((delay, i) => setTimeout(() => setAnalysisCurrentStep(i + 1), delay));

      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sources: website.trim() ? { website: website.trim() } : undefined,
            url: website.trim() || undefined,
            goal: targetAudience.trim() ? `Target audience: ${targetAudience.trim()}` : undefined,
          }),
        });

        timers.forEach(clearTimeout);
        setAnalysisCurrentStep(steps.length + 1);

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Analysis failed. Please try again.");
          setSubmittingWorkspace(false);
          setStartedAnalysis(false);
          return;
        }
        setBrief(data.brief);
        setSiteId(data.site_id);
      } catch {
        timers.forEach(clearTimeout);
        setError("Network error. Please try again.");
        setSubmittingWorkspace(false);
        setStartedAnalysis(false);
      }
    } catch {
      setError("Network error. Please try again.");
      setSubmittingWorkspace(false);
    }
  }

  async function handleConfirmBrief(confirmedBrief: MarketingBrief) {
    setConfirmLoading(true);
    try {
      const res = await fetch(`/api/sites/${siteId}/confirm-brief`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: confirmedBrief }),
      });
      if (!res.ok) throw new Error("Failed");

      const planRes = await fetch(`/api/generate-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_id: siteId, starter_content_count: 3 }),
      });

      if (planRes.ok || planRes.status === 409) {
        router.push(`/sites/${siteId}/plan`);
        return;
      }

      router.push(`/sites/${siteId}/plan`);
    } catch {
      setConfirmLoading(false);
      setError("Failed to confirm your brief. Try again.");
    }
  }

  useEffect(() => {
    if (brief) setSubmittingWorkspace(false);
  }, [brief]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
            <RocketLaunchIcon className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-lg">{BRAND_NAME}</span>
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 py-12">
        <div className={`w-full ${brief || startedAnalysis ? "max-w-2xl" : "max-w-lg"}`}>
          {!startedAnalysis && !brief ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Set up your workspace</h1>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Give {BRAND_NAME} enough context to build your first real distribution plan. Keep it simple — we can add channels and automation later.
                </p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Company or product name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Acme Inc."
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    autoFocus
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 placeholder:text-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Website URL
                    <span className="text-gray-400 font-normal ml-1">(recommended)</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://yoursite.com"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 placeholder:text-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    What do you do? <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    placeholder="We help [audience] do [thing] by [how]"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 placeholder:text-gray-400 resize-none"
                  />
                  <p className="mt-1.5 text-xs text-gray-400">Used to personalize your brief, plan, and generated drafts.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Target audience
                    <span className="text-gray-400 font-normal ml-1">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Indie hackers, SaaS founders, recruiters..."
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 placeholder:text-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Your timezone
                  </label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 bg-white text-gray-900"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button
                  onClick={startWorkspaceAndAnalysis}
                  disabled={!formValid || submittingWorkspace}
                  className="w-full rounded-xl bg-brand-500 text-white font-semibold py-3.5 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {submittingWorkspace ? (
                    <>
                      <Spinner />
                      Creating workspace…
                    </>
                  ) : (
                    "Create workspace and build my brief"
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Building your first plan</h1>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {brief
                    ? "Your marketing brief is ready. Confirm the details and we&apos;ll build your first strategy and starter drafts."
                    : "We&apos;re analyzing your product and turning it into a strategy."}
                </p>
              </div>

              {!brief ? (
                <div className="space-y-4">
                  <AnalysisProgress steps={analysisProgressSteps} currentStep={analysisCurrentStep} />
                  {error ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      {error}
                    </div>
                  ) : null}
                </div>
              ) : (
                <MarketingBriefCard
                  brief={brief}
                  onConfirm={handleConfirmBrief}
                  loading={confirmLoading}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
