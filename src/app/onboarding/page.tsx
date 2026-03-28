"use client";

import { useState, useEffect, useRef } from "react";
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

const PLATFORMS = [
  { id: "twitter", label: "Twitter / X", emoji: "🐦", placeholder: "@username" },
  { id: "instagram", label: "Instagram", emoji: "📸", placeholder: "@username" },
  { id: "linkedin", label: "LinkedIn", emoji: "💼", placeholder: "linkedin.com/in/username or company URL" },
  { id: "tiktok", label: "TikTok", emoji: "🎵", placeholder: "@username" },
] as const;

type PlatformId = (typeof PLATFORMS)[number]["id"];

interface AuditResult {
  platform: string;
  handle: string;
  bio_recommendation: string;
  what_to_change: string[];
  why: string;
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function StepIndicator({ step }: { step: 1 | 2 | 3 | 4 }) {
  const steps = [
    { num: 1, label: "Business" },
    { num: 2, label: "Platforms" },
    { num: 3, label: "Profile audit" },
    { num: 4, label: "Build your plan" },
  ];

  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((s, i) => {
        const active = step === s.num;
        const done = step > s.num;
        return (
          <div key={s.num} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-colors ${
                active
                  ? "bg-brand-500 text-white"
                  : done
                  ? "bg-brand-100 text-brand-600"
                  : "bg-gray-200 text-gray-400"
              }`}
            >
              {done ? (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                s.num
              )}
            </div>
            <span
              className={`text-sm font-medium ${
                active ? "text-brand-600" : done ? "text-brand-500" : "text-gray-400"
              }`}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && <div className="flex-1 h-px bg-gray-200 w-6" />}
          </div>
        );
      })}
    </div>
  );
}

function CopyableBox({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="relative">
      <textarea
        readOnly
        value={text}
        rows={3}
        className="w-full px-4 py-3 pr-20 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 resize-none focus:outline-none font-mono leading-relaxed"
      />
      <button
        onClick={handleCopy}
        className="absolute top-2.5 right-2.5 px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-600"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

function PlatformCard({
  platform,
  selected,
  handle,
  onToggle,
  onHandleChange,
}: {
  platform: (typeof PLATFORMS)[number];
  selected: boolean;
  handle: string;
  onToggle: () => void;
  onHandleChange: (val: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selected && inputRef.current) {
      inputRef.current.focus();
    }
  }, [selected]);

  return (
    <div
      className={`rounded-xl border-2 transition-all ${
        selected
          ? "border-brand-500 bg-brand-50"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
      >
        <span className="text-xl">{platform.emoji}</span>
        <span className={`font-medium text-sm flex-1 ${selected ? "text-brand-700" : "text-gray-700"}`}>
          {platform.label}
        </span>
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
            selected ? "border-brand-500 bg-brand-500" : "border-gray-300"
          }`}
        >
          {selected && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </button>

      {selected && (
        <div className="px-4 pb-4">
          <input
            ref={inputRef}
            type="text"
            value={handle}
            onChange={(e) => onHandleChange(e.target.value)}
            placeholder={platform.placeholder}
            className="w-full px-3 py-2.5 rounded-lg border border-brand-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 placeholder:text-gray-400"
          />
        </div>
      )}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();

  // Step 1 — Business
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [timezone, setTimezone] = useState("UTC");

  // Step 2 — Social
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<PlatformId>>(new Set());
  const [handles, setHandles] = useState<Record<PlatformId, string>>({
    twitter: "",
    instagram: "",
    linkedin: "",
    tiktok: "",
  });

  // Step 3 — Audit results
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState("");
  const [audits, setAudits] = useState<AuditResult[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Step 4 — Inline analysis
  const [analysisProgressSteps, setAnalysisProgressSteps] = useState<ProgressStep[]>([]);
  const [analysisCurrentStep, setAnalysisCurrentStep] = useState(0);
  const [brief, setBrief] = useState<MarketingBrief | null>(null);
  const [siteId, setSiteId] = useState<string>("");
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState("");

  const step1Valid = companyName.trim().length > 0 && description.trim().length > 0;
  const step2Valid = selectedPlatforms.size > 0;

  function togglePlatform(id: PlatformId) {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function setHandle(id: PlatformId, value: string) {
    setHandles((prev) => ({ ...prev, [id]: value }));
  }

  async function runAudit() {
    setAuditLoading(true);
    setAuditError("");

    const platforms = Array.from(selectedPlatforms).map((id) => ({
      platform: id,
      handle: handles[id] || `@${id}`,
    }));

    try {
      const res = await fetch("/api/social-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: companyName.trim(),
          description: description.trim(),
          target_audience: targetAudience.trim() || undefined,
          website: website.trim() || undefined,
          platforms,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setAuditError(data.error || "Failed to analyze profiles. Please try again.");
        setAuditLoading(false);
        return;
      }

      const data = await res.json();
      setAudits(data.audits ?? []);
    } catch {
      setAuditError("Network error. Please try again.");
    } finally {
      setAuditLoading(false);
    }
  }

  async function runAnalysis() {
    setAnalysisError("");
    setBrief(null);
    setAnalysisCurrentStep(0);

    // Build progress steps
    const steps: ProgressStep[] = [];
    const websiteUrl = website.trim();
    const twitterHandle = selectedPlatforms.has("twitter") ? handles.twitter.trim() : "";
    const instagramHandle = selectedPlatforms.has("instagram") ? handles.instagram.trim() : "";
    const linkedinUrl = selectedPlatforms.has("linkedin") ? handles.linkedin.trim() : "";

    if (websiteUrl) steps.push({ id: "website", label: "Analyzing website...", status: "pending" });
    if (twitterHandle) steps.push({ id: "twitter", label: "Analyzing Twitter/X...", status: "pending" });
    if (instagramHandle) steps.push({ id: "instagram", label: "Analyzing Instagram...", status: "pending" });
    if (linkedinUrl) steps.push({ id: "linkedin", label: "Analyzing LinkedIn...", status: "pending" });
    steps.push({ id: "merge", label: "Merging business insights...", status: "pending" });
    steps.push({ id: "brief", label: "Generating your marketing brief...", status: "pending" });
    setAnalysisProgressSteps(steps);

    // Animate progress
    const stepTimings = steps.map((_, i) => 800 + i * 1300);
    const timers = stepTimings.map((delay, i) => setTimeout(() => setAnalysisCurrentStep(i + 1), delay));

    // Build sources
    const sources: Record<string, unknown> = {};
    if (websiteUrl) sources.website = websiteUrl;
    if (twitterHandle) sources.twitter = twitterHandle;
    if (instagramHandle) sources.instagram = instagramHandle;
    if (linkedinUrl) sources.linkedin = linkedinUrl;
    // If nothing to analyze from URLs, use description as fallback
    if (Object.keys(sources).length === 0) {
      sources.manual = {
        business_name: companyName.trim(),
        description: description.trim(),
        target_audience: targetAudience.trim(),
      };
    }

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sources, url: websiteUrl || undefined }),
      });
      timers.forEach(clearTimeout);
      setAnalysisCurrentStep(steps.length + 1);

      const data = await res.json();
      if (!res.ok) {
        setAnalysisError(data.error || "Analysis failed. Please try again.");
        return;
      }
      setBrief(data.brief);
      setSiteId(data.site_id);
    } catch {
      timers.forEach(clearTimeout);
      setAnalysisError("Network error. Please try again.");
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
      router.push(`/sites/${siteId}/social`);
    } catch {
      setConfirmLoading(false);
    }
  }

  // When entering step 3, kick off the audit automatically
  useEffect(() => {
    if (step === 3) {
      runAudit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // When entering step 4, kick off the analysis automatically
  useEffect(() => {
    if (step === 4) {
      runAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  async function handleFinish() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_name: companyName.trim(), timezone }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setAuditError(data.error || "Something went wrong.");
        setSubmitting(false);
        return;
      }
      setStep(4); // go to step 4 — no redirect
    } catch {
      setAuditError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  const platformLabel = (id: string) => {
    return PLATFORMS.find((p) => p.id === id)?.label ?? id;
  };

  const platformEmoji = (id: string) => {
    return PLATFORMS.find((p) => p.id === id)?.emoji ?? "";
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="h-16 flex items-center px-6 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
            <RocketLaunchIcon className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-lg">{BRAND_NAME}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center px-4 py-12">
        <div className={`w-full ${step === 4 ? "max-w-2xl" : "max-w-lg"}`}>
          <StepIndicator step={step} />

          {/* ─── Step 1: Business ─────────────────────────────────────── */}
          {step === 1 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to {BRAND_NAME}</h1>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Tell us about your business so we can personalize your marketing plan.
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
                    <span className="text-gray-400 font-normal ml-1">(optional)</span>
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
                  <p className="mt-1.5 text-xs text-gray-400">Used to personalize all your generated content</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Target audience
                    <span className="text-gray-400 font-normal ml-1">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Indie hackers, freelance designers, SaaS founders..."
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
                  <p className="mt-1.5 text-xs text-gray-400">Used for scheduling your content calendar</p>
                </div>

                <button
                  type="button"
                  disabled={!step1Valid}
                  onClick={() => setStep(2)}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Next: Set up your social profiles
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* ─── Step 2: Social Media ─────────────────────────────────── */}
          {step === 2 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Which platforms do you want to post on?
                </h2>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Select all that apply. We'll audit your existing profiles and suggest improvements.
                </p>
              </div>

              <div className="space-y-3 mb-6">
                {PLATFORMS.map((platform) => (
                  <PlatformCard
                    key={platform.id}
                    platform={platform}
                    selected={selectedPlatforms.has(platform.id)}
                    handle={handles[platform.id]}
                    onToggle={() => togglePlatform(platform.id)}
                    onHandleChange={(val) => setHandle(platform.id, val)}
                  />
                ))}
              </div>

              {!step2Valid && (
                <p className="text-xs text-gray-400 mb-4 text-center">
                  Select at least one platform to continue
                </p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center justify-center gap-2 py-3 px-5 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-colors text-sm"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
                <button
                  type="button"
                  disabled={!step2Valid}
                  onClick={() => setStep(3)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Analyze my profiles
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* ─── Step 3: Profile Audit ───────────────────────────────── */}
          {step === 3 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile audit</h2>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Here's what to update on each platform to attract your ideal customers.
                </p>
              </div>

              {/* Loading state */}
              {auditLoading && (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center">
                    <svg className="animate-spin w-6 h-6 text-brand-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-900 mb-1">Analyzing your profiles...</p>
                    <p className="text-sm text-gray-500">This takes about 10–15 seconds</p>
                  </div>
                </div>
              )}

              {/* Error state */}
              {!auditLoading && auditError && (
                <div className="space-y-4">
                  <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
                    {auditError}
                  </div>
                  <button
                    type="button"
                    onClick={runAudit}
                    className="w-full py-3 px-4 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors text-sm"
                  >
                    Try again
                  </button>
                </div>
              )}

              {/* Results */}
              {!auditLoading && !auditError && audits.length > 0 && (
                <div className="space-y-6">
                  {audits.map((audit) => (
                    <div
                      key={`${audit.platform}-${audit.handle}`}
                      className="rounded-xl border border-gray-100 overflow-hidden"
                    >
                      {/* Card header */}
                      <div className="flex items-center gap-3 px-5 py-4 bg-gray-50 border-b border-gray-100">
                        <span className="text-xl">{platformEmoji(audit.platform)}</span>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{platformLabel(audit.platform)}</p>
                          <p className="text-xs text-gray-500">{audit.handle}</p>
                        </div>
                      </div>

                      <div className="p-5 space-y-5">
                        {/* Recommended bio */}
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                            Recommended bio
                          </p>
                          <CopyableBox text={audit.bio_recommendation} />
                        </div>

                        {/* What to change */}
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                            What to change
                          </p>
                          <ul className="space-y-1.5">
                            {audit.what_to_change.map((item, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                <span className="mt-0.5 text-brand-500 font-bold shrink-0">•</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Why */}
                        <p className="text-xs text-gray-400 italic">{audit.why}</p>
                      </div>
                    </div>
                  ))}

                  {/* CTA */}
                  <div className="pt-2">
                    {auditError && (
                      <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">
                        {auditError}
                      </div>
                    )}
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleFinish}
                      className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {submitting ? (
                        <>
                          <Spinner />
                          Setting up your workspace...
                        </>
                      ) : (
                        <>
                          Set up my marketing plan
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </>
                      )}
                    </button>
                    <p className="text-center text-xs text-gray-400 mt-3">
                      Your workspace will be created and we'll start building your marketing plan
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── Step 4: Inline Site Analysis ───────────────────────── */}
          {step === 4 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
              {/* Error state */}
              {analysisError && (
                <div className="space-y-4">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Analyzing your business...</h2>
                  </div>
                  <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
                    {analysisError}
                  </div>
                  <button
                    type="button"
                    onClick={runAnalysis}
                    className="w-full py-3 px-4 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors text-sm"
                  >
                    Try again
                  </button>
                </div>
              )}

              {/* Progress / loading state */}
              {!brief && !analysisError && (
                <>
                  <div className="mb-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-50 text-brand-600 rounded-full text-xs font-semibold mb-4">
                      <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                      Analyzing
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Analyzing your business...</h2>
                    <p className="text-gray-500 text-sm leading-relaxed">
                      Building your personalized marketing brief. This takes about 30 seconds.
                    </p>
                  </div>
                  <AnalysisProgress
                    steps={analysisProgressSteps}
                    currentStep={analysisCurrentStep}
                  />
                </>
              )}

              {/* Brief review */}
              {brief && !analysisError && (
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
