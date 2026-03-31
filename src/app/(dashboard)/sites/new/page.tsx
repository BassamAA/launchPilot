"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui";
import { BRAND_NAME } from "@/lib/brand";

type Step = "input" | "analyzing" | "profile";

interface Profile {
  product_name: string;
  one_liner: string;
  target_customer: string;
  pain_point: string;
  value_proposition: string;
  positioning: string;
  recommended_channels: { channel: string; priority: number }[];
  goal?: string;
}

const GOAL_PRESETS = [
  { id: "customers", label: "Get more customers", icon: "💰" },
  { id: "following", label: "Grow my social following", icon: "📈" },
  { id: "brand", label: "Build my personal brand", icon: "⭐" },
  { id: "influencer", label: "Become an influencer", icon: "🎯" },
  { id: "other", label: "Something else", icon: "✏️" },
];

const SOCIAL_CHANNELS = [
  { key: "website", label: "Website", placeholder: "https://yoursite.com" },
  { key: "twitter", label: "Twitter / X", placeholder: "https://x.com/yourhandle  or  @yourhandle" },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/yourhandle  or  @yourhandle" },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/in/yourprofile" },
];

const ANALYZING_MESSAGES = [
  "Reading your pages…",
  "Understanding your audience…",
  "Figuring out what makes you different…",
  "Building your profile…",
  "Almost there…",
];

export default function NewSitePage() {
  const router = useRouter();

  const [urls, setUrls] = useState<Record<string, string>>({
    website: "", twitter: "", instagram: "", linkedin: "",
  });
  const [goalPreset, setGoalPreset] = useState<string>("");
  const [goalText, setGoalText] = useState("");
  const [niche, setNiche] = useState("");
  const [step, setStep] = useState<Step>("input");
  const [analyzingMsg, setAnalyzingMsg] = useState(0);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState<keyof Profile | null>(null);
  const [siteId, setSiteId] = useState("");
  const [error, setError] = useState("");
  const [confirmLoading, setConfirmLoading] = useState(false);

  const hasAnyUrl = Object.values(urls).some((v) => v.trim().length > 0);
  const finalGoal = goalPreset === "influencer" && niche
    ? `Become an influencer in ${niche}`
    : goalPreset === "other" && goalText
    ? goalText
    : GOAL_PRESETS.find((p) => p.id === goalPreset)?.label ?? goalText;

  async function analyze() {
    if (!hasAnyUrl) return;
    setError("");
    setStep("analyzing");

    // Cycle through messages
    const interval = setInterval(() => {
      setAnalyzingMsg((n) => (n + 1) % ANALYZING_MESSAGES.length);
    }, 2200);

    try {
      const sources: Record<string, string> = {};
      if (urls.website.trim()) sources.website = urls.website.trim();
      if (urls.twitter.trim()) sources.twitter = urls.twitter.trim().replace("@", "");
      if (urls.instagram.trim()) sources.instagram = urls.instagram.trim().replace("@", "");
      if (urls.linkedin.trim()) sources.linkedin = urls.linkedin.trim();

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sources: { ...sources },
          url: urls.website.trim() || undefined,
          goal: finalGoal || undefined,
        }),
      });

      clearInterval(interval);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Try again.");
        setStep("input");
        return;
      }

      setProfile({ ...data.brief, goal: finalGoal || data.brief.one_liner });
      setSiteId(data.site_id);
      setStep("profile");
    } catch {
      clearInterval(interval);
      setError("Network error. Check your connection and try again.");
      setStep("input");
    }
  }

  async function confirm() {
    if (!profile || !siteId) return;
    setConfirmLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/sites/${siteId}/confirm-brief`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: profile }),
      });
      if (!res.ok) throw new Error("confirm_failed");

      const planRes = await fetch(`/api/generate-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_id: siteId, starter_content_count: 3 }),
      });

      if (planRes.ok || planRes.status === 409) {
        router.push(`/sites/${siteId}/plan`);
        return;
      }

      const planData = await planRes.json().catch(() => null);
      setError(planData?.error || "Your brief was saved, but we couldn't generate the plan yet. You can retry from the Plan page.");
      router.push(`/sites/${siteId}/plan`);
    } catch {
      setError("Failed to save. Try again.");
      setConfirmLoading(false);
    }
  }

  function updateProfile(key: keyof Profile, value: string) {
    setProfile((p) => p ? { ...p, [key]: value } : p);
  }

  // ── INPUT STEP ───────────────────────────────────────────────────────────────

  if (step === "input") {
    return (
      <div className="max-w-lg mx-auto py-8 space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Where are you online?
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Paste any pages you have — {BRAND_NAME} will read them and build your marketing plan
          </p>
        </div>

        {/* URL inputs */}
        <div className="space-y-3">
          {SOCIAL_CHANNELS.map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{label}</label>
              <input
                type="text"
                placeholder={placeholder}
                value={urls[key]}
                onChange={(e) => setUrls((prev) => ({ ...prev, [key]: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-300 dark:focus:ring-brand-600 transition"
              />
            </div>
          ))}
          <p className="text-xs text-gray-400 dark:text-gray-500 pt-1">
            You don&apos;t need all of them — even just one is enough to get started
          </p>
        </div>

        {/* Goal */}
        <div>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
            What do you want to achieve?
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {GOAL_PRESETS.map((g) => (
              <button
                key={g.id}
                onClick={() => setGoalPreset(goalPreset === g.id ? "" : g.id)}
                className={`flex flex-col items-start gap-1 rounded-xl border px-3 py-2.5 text-left text-sm transition-all ${
                  goalPreset === g.id
                    ? "border-brand-400 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 font-semibold"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-brand-200 hover:bg-brand-50/50"
                }`}
              >
                <span>{g.icon}</span>
                <span>{g.label}</span>
              </button>
            ))}
          </div>

          {goalPreset === "influencer" && (
            <input
              type="text"
              placeholder="Which niche? e.g. fitness, personal finance, cooking..."
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              className="mt-3 w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-300 transition"
              autoFocus
            />
          )}

          {goalPreset === "other" && (
            <input
              type="text"
              placeholder="Describe your goal..."
              value={goalText}
              onChange={(e) => setGoalText(e.target.value)}
              className="mt-3 w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-300 transition"
              autoFocus
            />
          )}
        </div>

        {error && (
          <p className="text-sm text-red-500 text-center">{error}</p>
        )}

        <button
          onClick={analyze}
          disabled={!hasAnyUrl}
          className="w-full rounded-xl bg-brand-500 text-white font-bold py-3.5 text-base hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Analyze my pages →
        </button>
      </div>
    );
  }

  // ── ANALYZING STEP ───────────────────────────────────────────────────────────

  if (step === "analyzing") {
    return (
      <div className="max-w-sm mx-auto py-20 flex flex-col items-center gap-6 text-center">
        <Spinner />
        <div>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {ANALYZING_MESSAGES[analyzingMsg]}
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Usually takes 20–40 seconds
          </p>
        </div>
      </div>
    );
  }

  // ── PROFILE STEP ─────────────────────────────────────────────────────────────

  if (step === "profile" && profile) {
    const displayFields: { key: keyof Profile; label: string; multiline?: boolean }[] = [
      { key: "product_name", label: "Your name / brand" },
      { key: "one_liner", label: "What you do", multiline: true },
      { key: "target_customer", label: "Who you help", multiline: true },
      { key: "goal", label: "Your goal", multiline: true },
      { key: "value_proposition", label: "Why people choose you", multiline: true },
    ];

    const topChannels = (profile.recommended_channels ?? [])
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 3)
      .map((c) => c.channel)
      .filter((c) => c !== "blog");

    return (
      <div className="max-w-lg mx-auto py-8 space-y-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold rounded-full mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Analysis complete
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Here&apos;s what we know about you
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Read through and correct anything that&apos;s off — this shapes everything we generate
          </p>
        </div>

        {/* Profile fields */}
        <div className="space-y-3">
          {displayFields.map(({ key, label, multiline }) => (
            <div
              key={key}
              onClick={() => setEditing(editing === key ? null : key)}
              className="group rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 cursor-pointer hover:border-brand-200 dark:hover:border-brand-700 transition-colors"
            >
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
                {label}
              </p>
              {editing === key ? (
                multiline ? (
                  <textarea
                    value={profile[key] as string}
                    onChange={(e) => updateProfile(key, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    rows={3}
                    autoFocus
                    className="w-full bg-transparent text-sm text-gray-900 dark:text-gray-100 resize-none focus:outline-none leading-relaxed"
                  />
                ) : (
                  <input
                    type="text"
                    value={profile[key] as string}
                    onChange={(e) => updateProfile(key, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                    className="w-full bg-transparent text-sm text-gray-900 dark:text-gray-100 focus:outline-none"
                  />
                )
              ) : (
                <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                  {(profile[key] as string) || <span className="text-gray-400 italic">Not specified</span>}
                </p>
              )}
              {editing !== key && (
                <p className="text-xs text-gray-300 dark:text-gray-600 group-hover:text-brand-400 transition-colors mt-1">
                  Click to edit
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Focus channels */}
        {topChannels.length > 0 && (
          <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
              We&apos;ll focus your plan on
            </p>
            <div className="flex gap-2 flex-wrap">
              {topChannels.map((ch) => (
                <span
                  key={ch}
                  className="px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 text-sm font-semibold capitalize"
                >
                  {ch === "twitter" ? "Twitter / X" : ch}
                </span>
              ))}
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        <button
          onClick={confirm}
          disabled={confirmLoading}
          className="w-full rounded-xl bg-brand-500 text-white font-bold py-3.5 text-base hover:bg-brand-600 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
        >
          {confirmLoading ? (
            <>
              <Spinner />
              Saving brief and building your plan…
            </>
          ) : (
            "Looks right — build my plan →"
          )}
        </button>

        <button
          onClick={() => setStep("input")}
          className="w-full text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          ← Go back and re-analyze
        </button>
      </div>
    );
  }

  return null;
}
