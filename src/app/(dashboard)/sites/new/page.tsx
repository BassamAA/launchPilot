"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Card, Textarea } from "@/components/ui";
import { AnalysisProgress, ProgressStep } from "@/components/sites/AnalysisProgress";
import { MarketingBriefCard } from "@/components/sites/MarketingBriefCard";
import { MarketingBrief } from "@/types";
import { useToast } from "@/components/ui/Toast";
import {
  RocketLaunchIcon,
  SparklesIcon,
  BeakerIcon,
} from "@heroicons/react/24/solid";
import { BRAND_NAME } from "@/lib/brand";

type Step = "input" | "analyzing" | "brief";

export default function NewSitePage() {
  const router = useRouter();
  const { toast } = useToast();

  const [url, setUrl] = useState("");
  const [twitter, setTwitter] = useState("");
  const [instagram, setInstagram] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [instagramBusinessType, setInstagramBusinessType] = useState("");
  const [instagramAudience, setInstagramAudience] = useState("");
  const [instagramOffering, setInstagramOffering] = useState("");
  const [linkedinHeadline, setLinkedinHeadline] = useState("");
  const [linkedinAbout, setLinkedinAbout] = useState("");
  const [linkedinIndustry, setLinkedinIndustry] = useState("");
  const [step, setStep] = useState<Step>("input");
  const [analysisStep, setAnalysisStep] = useState(0);
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([]);
  const [brief, setBrief] = useState<MarketingBrief | null>(null);
  const [siteId, setSiteId] = useState<string>("");
  const [sourcesJson, setSourcesJson] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  function buildSteps() {
    const steps: ProgressStep[] = [];
    if (url.trim()) steps.push({ id: "website", label: "Analyzing website...", status: "pending" });
    if (twitter.trim()) steps.push({ id: "twitter", label: "Analyzing Twitter/X...", status: "pending" });
    if (instagram.trim()) steps.push({ id: "instagram", label: "Analyzing Instagram...", status: "pending" });
    if (linkedin.trim()) steps.push({ id: "linkedin", label: "Analyzing LinkedIn...", status: "pending" });
    steps.push({ id: "merge", label: "Merging business insights...", status: "pending" });
    steps.push({ id: "brief", label: "Generating your unified marketing brief...", status: "pending" });
    return steps;
  }

  async function handleAnalyze() {
    const sources = {
      website: url.trim() || undefined,
      twitter: twitter.trim() || undefined,
      instagram: instagram.trim() || undefined,
      linkedin: linkedin.trim() || undefined,
      instagram_manual:
        instagram.trim() && (instagramBusinessType || instagramAudience || instagramOffering)
          ? {
              businessType: instagramBusinessType,
              targetAudience: instagramAudience,
              mainOffering: instagramOffering,
            }
          : undefined,
      linkedin_manual:
        linkedin.trim() && (linkedinHeadline || linkedinAbout || linkedinIndustry)
          ? {
              headline: linkedinHeadline,
              aboutText: linkedinAbout,
              industry: linkedinIndustry,
            }
          : undefined,
    };

    if (!Object.values(sources).some((value) => {
      if (typeof value === "string") return value.trim().length > 0;
      return false;
    })) return;

    setError("");
    setStep("analyzing");
    setAnalysisStep(0);
    const steps = buildSteps();
    setProgressSteps(steps);

    const stepTimings = steps.map((_, index) => 800 + index * 1300);
    const timers = stepTimings.map((delay, i) =>
      setTimeout(() => setAnalysisStep(i + 1), delay)
    );

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sources, url: url.trim() || undefined }),
      });

      timers.forEach(clearTimeout);
      setAnalysisStep(6);

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Analysis failed. Please try again.");
        setStep("input");
        return;
      }

      setBrief(data.brief);
      setSiteId(data.site_id);
      setSourcesJson(data.sources_json || null);
      setStep("brief");
    } catch {
      timers.forEach(clearTimeout);
      setError("Network error. Please check your connection and try again.");
      setStep("input");
    }
  }

  async function handleDemo() {
    setDemoLoading(true);
    try {
      const res = await fetch("/api/demo", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast("Demo site loaded! Explore the full experience.", "success");
      router.push(`/sites/${data.site_id}`);
    } catch {
      toast("Couldn't load demo. Try analyzing a real URL.", "error");
    } finally {
      setDemoLoading(false);
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
      toast("Brief confirmed! Generating your plan…", "success");
      router.push(`/sites/${siteId}`);
    } catch {
      toast("Failed to confirm brief. Try again.", "error");
      setConfirmLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {step === "input" && (
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-6">
            <RocketLaunchIcon className="w-8 h-8 text-brand-500" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Add your site</h1>
          <p className="text-gray-500 mb-10 leading-relaxed">
            Tell {BRAND_NAME} where your business lives online. Add any combination of website,
            Twitter, Instagram, or LinkedIn and {BRAND_NAME} will merge the signals into one strategy.
          </p>

          <Card padding="lg">
            <div className="space-y-4">
              <Input
                label="Website URL"
                type="url"
                placeholder="https://yourproduct.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                autoFocus
                helper="Optional, but still the richest source when available."
              />

              <Input
                label="Twitter / X handle"
                placeholder="@yourhandle"
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
              />

              <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
                <Input
                  label="Instagram handle"
                  placeholder="@yourhandle"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  helper="Profile-level public data only. Add optional context below if your profile is sparse."
                />
                {instagram.trim() && (
                  <div className="grid gap-3 md:grid-cols-3">
                    <Input
                      label="Business type"
                      placeholder="creator, ecommerce, local..."
                      value={instagramBusinessType}
                      onChange={(e) => setInstagramBusinessType(e.target.value)}
                    />
                    <Input
                      label="Target audience"
                      placeholder="Who you sell to"
                      value={instagramAudience}
                      onChange={(e) => setInstagramAudience(e.target.value)}
                    />
                    <Input
                      label="Main offering"
                      placeholder="What you sell"
                      value={instagramOffering}
                      onChange={(e) => setInstagramOffering(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
                <Input
                  label="LinkedIn URL"
                  placeholder="https://linkedin.com/company/example"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  helper="Company page or personal profile URL."
                />
                {linkedin.trim() && (
                  <div className="grid gap-3">
                    <Input
                      label="Headline"
                      placeholder="Optional fallback if LinkedIn blocks the fetch"
                      value={linkedinHeadline}
                      onChange={(e) => setLinkedinHeadline(e.target.value)}
                    />
                    <Input
                      label="Industry"
                      placeholder="Optional"
                      value={linkedinIndustry}
                      onChange={(e) => setLinkedinIndustry(e.target.value)}
                    />
                    <Textarea
                      label="About text"
                      placeholder="Optional fallback summary"
                      value={linkedinAbout}
                      onChange={(e) => setLinkedinAbout(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              <Button
                className="w-full"
                size="lg"
                onClick={handleAnalyze}
                disabled={!url.trim() && !twitter.trim() && !instagram.trim() && !linkedin.trim()}
              >
                <SparklesIcon className="w-5 h-5" />
                Analyze my business
              </Button>
            </div>

            {/* Demo option */}
            <div className="mt-6 pt-5 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Want to explore first?</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Load a pre-analyzed demo site and see the full experience immediately.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDemo}
                  loading={demoLoading}
                >
                  <BeakerIcon className="w-4 h-4" />
                  Try demo
                </Button>
              </div>
            </div>
          </Card>

          <p className="mt-6 text-sm text-gray-400">
            Analysis takes 30–60 seconds · Your data stays private
          </p>
        </div>
      )}

      {step === "analyzing" && (
        <div className="flex flex-col items-center py-8 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-8 max-w-md w-full animate-slide-up">
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-50 text-brand-600 rounded-full text-xs font-semibold mb-4">
                <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                Analyzing
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">{BRAND_NAME} is building your business profile</h2>
              <p className="text-sm text-gray-500">
                Website, social signals, and profile context are being merged into one strategy-ready brief.
              </p>
            </div>
            <AnalysisProgress steps={progressSteps} currentStep={analysisStep} />
          </div>
          <p className="text-sm text-gray-400 animate-pulse-soft">
            Hang tight — {BRAND_NAME} is merging your online presence into one business profile…
          </p>
        </div>
      )}

      {step === "brief" && brief && (
        <div className="animate-slide-up">
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <p className="text-sm font-semibold text-emerald-800">
              ✨ Analysis complete!
            </p>
            <p className="text-xs text-emerald-700 mt-0.5">
              Review your marketing brief below. Edit anything that needs tweaking, then confirm to generate your 30-day plan.
            </p>
          </div>
          <MarketingBriefCard
            brief={brief}
            onConfirm={handleConfirmBrief}
            loading={confirmLoading}
            sourcesJson={sourcesJson || undefined}
          />
        </div>
      )}
    </div>
  );
}
