"use client";

import { useState } from "react";

interface AngleGap {
  angle: string;
  why_it_matters: string;
  what_youre_missing: string;
  action_steps: string[];
  content_ideas: string[];
}

export function AngleGaps({ siteId }: { siteId: string }) {
  const [loading, setLoading] = useState(false);
  const [gaps, setGaps] = useState<AngleGap[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sites/${siteId}/angle-gaps`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setGaps(data.gaps || []);
      setExpanded(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (!gaps) {
    return (
      <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Missing Angles</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Find the content and positioning angles your business isn&apos;t covering — with exact steps to activate each one.
            </p>
          </div>
          <button
            onClick={run}
            disabled={loading}
            className="flex-shrink-0 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 transition-colors"
          >
            {loading ? "Analyzing…" : "Find missing angles"}
          </button>
        </div>
        {error && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Missing Angles</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {gaps.length} angles your content isn&apos;t covering
          </p>
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="text-xs text-brand-600 dark:text-brand-400 hover:underline disabled:opacity-50"
        >
          {loading ? "Re-analyzing…" : "Re-run"}
        </button>
      </div>

      <div className="space-y-2">
        {gaps.map((gap, i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden"
          >
            {/* Accordion header */}
            <button
              onClick={() => setExpanded(expanded === i ? null : i)}
              className="w-full flex items-start gap-3 px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{gap.angle}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                  {gap.what_youre_missing}
                </p>
              </div>
              <span className="text-gray-300 dark:text-gray-600 text-xs ml-2 mt-1">
                {expanded === i ? "▲" : "▼"}
              </span>
            </button>

            {/* Expanded body */}
            {expanded === i && (
              <div className="border-t border-gray-50 dark:border-gray-700 px-5 py-4 space-y-5">
                {/* Why it matters */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1.5">
                    Why this matters for you
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {gap.why_it_matters}
                  </p>
                </div>

                {/* Action steps */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
                    How to activate this angle
                  </p>
                  <ol className="space-y-2">
                    {gap.action_steps.map((step, si) => (
                      <li key={si} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                        <span className="w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                          {si + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Content ideas */}
                {gap.content_ideas?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
                      Content ideas to start with
                    </p>
                    <ul className="space-y-2">
                      {gap.content_ideas.map((idea, ci) => (
                        <li
                          key={ci}
                          className="rounded-lg bg-gray-50 dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 leading-relaxed"
                        >
                          {idea}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
