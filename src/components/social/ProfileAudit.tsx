"use client";

import { useState } from "react";
import { CheckCircleIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";

interface PlatformAudit {
  platform: string;
  connected: boolean;
  handle: string;
  current_bio: string | null;
  recommended_bio: string;
  what_to_change: string[];
  why: string;
}

const PLATFORM_STYLE: Record<string, { emoji: string; label: string }> = {
  twitter: { emoji: "𝕏", label: "Twitter / X" },
  linkedin: { emoji: "in", label: "LinkedIn" },
  instagram: { emoji: "📸", label: "Instagram" },
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
      className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export function ProfileAudit({ siteId }: { siteId: string }) {
  const [loading, setLoading] = useState(false);
  const [audits, setAudits] = useState<PlatformAudit[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sites/${siteId}/profile-audit`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setAudits(data.audits || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (!audits) {
    return (
      <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Profile Audit</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              We'll read your connected accounts and tell you exactly what to change on each bio.
            </p>
          </div>
          <button
            onClick={run}
            disabled={loading}
            className="flex-shrink-0 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 transition-colors"
          >
            {loading ? "Analyzing…" : "Audit my profiles"}
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
        <p className="text-sm font-semibold text-gray-900 dark:text-white">Profile Audit</p>
        <button
          onClick={run}
          disabled={loading}
          className="text-xs text-brand-600 dark:text-brand-400 hover:underline disabled:opacity-50"
        >
          {loading ? "Re-analyzing…" : "Re-run"}
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {audits.map((audit) => {
          const meta = PLATFORM_STYLE[audit.platform] ?? {
            emoji: "🌐",
            label: audit.platform,
          };
          return (
            <div
              key={audit.platform}
              className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden"
            >
              {/* Platform header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-50 dark:border-gray-700">
                <span className="font-bold text-gray-700 dark:text-gray-300 text-sm">
                  {meta.emoji}
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {meta.label}
                </span>
                {audit.handle && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {audit.handle}
                  </span>
                )}
                <span className="ml-auto">
                  {audit.connected ? (
                    <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <ExclamationCircleIcon className="w-4 h-4 text-amber-400" />
                  )}
                </span>
              </div>

              <div className="p-4 space-y-4">
                {/* Current bio */}
                {audit.current_bio && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1.5">
                      Current
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 italic leading-relaxed">
                      &ldquo;{audit.current_bio}&rdquo;
                    </p>
                    {audit.why && (
                      <p className="mt-2 text-xs text-red-500 dark:text-red-400">
                        {audit.why}
                      </p>
                    )}
                  </div>
                )}

                {/* Recommended bio */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1.5">
                    {audit.current_bio ? "Use this instead" : "Set this as your bio"}
                  </p>
                  <div className="rounded-lg bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800 p-3">
                    <p className="text-sm text-brand-900 dark:text-brand-100 leading-relaxed whitespace-pre-line">
                      {audit.recommended_bio}
                    </p>
                    <div className="mt-2">
                      <CopyButton text={audit.recommended_bio} />
                    </div>
                  </div>
                </div>

                {/* What to change */}
                {audit.what_to_change?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1.5">
                      What to fix
                    </p>
                    <ul className="space-y-1.5">
                      {audit.what_to_change.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <span className="mt-0.5 text-amber-400 flex-shrink-0">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Not connected note */}
                {!audit.connected && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                    Connect this account in Connections to get real-data analysis.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
