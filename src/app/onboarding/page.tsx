"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RocketLaunchIcon } from "@heroicons/react/24/solid";
import { BRAND_NAME } from "@/lib/brand";

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

export default function OnboardingPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_name: companyName.trim(), timezone }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      router.push("/sites/new");
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

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
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-8">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-brand-500 text-white text-xs font-bold flex items-center justify-center">1</div>
              <span className="text-sm font-medium text-brand-600">Set up workspace</span>
            </div>
            <div className="flex-1 h-px bg-gray-200" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-400 text-xs font-bold flex items-center justify-center">2</div>
              <span className="text-sm text-gray-400">Add your site</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to {BRAND_NAME}</h1>
              <p className="text-gray-500 text-sm leading-relaxed">
                Quick setup — takes 30 seconds. Then we'll analyze your first site and build your marketing plan.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Company or product name
                </label>
                <input
                  type="text"
                  placeholder="Acme Inc."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 placeholder:text-gray-400"
                />
                <p className="mt-1.5 text-xs text-gray-400">Used in your workspace and generated content</p>
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
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
                <p className="mt-1.5 text-xs text-gray-400">Used for scheduling your content calendar</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !companyName.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Setting up your workspace…
                  </>
                ) : (
                  <>
                    Continue — Add your first site
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
