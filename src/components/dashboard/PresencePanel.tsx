"use client";

import { useState } from "react";
import Link from "next/link";

interface Connection {
  platform: string;
  account_name: string | null;
  account_id: string | null;
  connected_at: string | null;
}

interface PlatformAudit {
  platform: string;
  connected: boolean;
  handle: string;
  current_bio: string | null;
  recommended_bio: string;
  what_to_change: string[];
  why: string;
}

interface PresencePanelProps {
  siteId: string;
  siteUrl: string;
  connections: Connection[];
}

const PLATFORMS = [
  {
    key: "twitter",
    label: "Twitter / X",
    icon: "𝕏",
    color: "text-gray-900 dark:text-white",
    connectHref: (siteId: string) => `/api/auth/twitter/connect?site_id=${siteId}`,
    connectLabel: "Connect X account",
    description: "Grow through short-form posts and conversations",
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    icon: "in",
    color: "text-blue-600",
    connectHref: (siteId: string) => `/api/auth/linkedin/connect?site_id=${siteId}`,
    connectLabel: "Connect LinkedIn",
    description: "B2B reach, thought leadership, professional audience",
  },
  {
    key: "instagram",
    label: "Instagram",
    icon: "◎",
    color: "text-pink-500",
    connectHref: () => "#",
    connectLabel: "Coming soon",
    description: "Visual storytelling and brand awareness",
  },
];

export function PresencePanel({ siteId, siteUrl, connections }: PresencePanelProps) {
  const [auditResults, setAuditResults] = useState<PlatformAudit[] | null>(null);
  const [auditing, setAuditing] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const connectedMap = Object.fromEntries(connections.map((c) => [c.platform, c]));

  async function runAudit() {
    setAuditing(true);
    setAuditError(null);
    try {
      const res = await fetch(`/api/sites/${siteId}/profile-audit`);
      if (!res.ok) throw new Error("Audit failed");
      const data = await res.json();
      setAuditResults(data.audits ?? []);
    } catch (e) {
      setAuditError(e instanceof Error ? e.message : "Failed to run audit");
    } finally {
      setAuditing(false);
    }
  }

  function getAudit(platform: string): PlatformAudit | null {
    return auditResults?.find((a) => a.platform === platform) ?? null;
  }

  return (
    <div className="space-y-3">
      {PLATFORMS.map((p) => {
        const conn = connectedMap[p.key];
        const audit = getAudit(p.key);
        const isExpanded = expanded === p.key;
        const hasIssues = audit && audit.what_to_change.length > 0;

        return (
          <div
            key={p.key}
            className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden"
          >
            {/* Main row */}
            <div className="flex items-center gap-3 px-4 py-3">
              {/* Icon */}
              <span className={`text-base font-black w-6 text-center flex-shrink-0 ${p.color}`}>
                {p.icon}
              </span>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{p.label}</span>
                  {conn ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                      {conn.account_name ?? "Connected"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block" />
                      Not connected
                    </span>
                  )}

                  {/* Audit badge */}
                  {audit && conn && (
                    <button
                      onClick={() => setExpanded(isExpanded ? null : p.key)}
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full transition-colors ${
                        hasIssues
                          ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100"
                          : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100"
                      }`}
                    >
                      {hasIssues ? `⚠ ${audit.what_to_change.length} things to fix` : "✓ Profile looks good"}
                    </button>
                  )}
                </div>

                {!conn && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{p.description}</p>
                )}

                {conn && !audit && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                    {conn.account_name ? `@${conn.account_name.replace("@", "")}` : "Connected"}
                    {" · "}profile not checked yet
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {conn ? (
                  <>
                    {p.key === "twitter" && (
                      <a
                        href={`https://x.com/intent/tweet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        Post
                      </a>
                    )}
                    {p.key === "linkedin" && (
                      <a
                        href="https://www.linkedin.com/feed/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Post
                      </a>
                    )}
                  </>
                ) : p.key === "instagram" ? (
                  <span className="text-xs text-gray-400 dark:text-gray-500 italic">Coming soon</span>
                ) : (
                  <a
                    href={p.connectHref(siteId)}
                    className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                  >
                    Connect →
                  </a>
                )}
              </div>
            </div>

            {/* Audit details (expanded) */}
            {isExpanded && audit && (
              <div className="border-t border-gray-50 dark:border-gray-700/50 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 space-y-3">
                {/* Current bio */}
                {audit.current_bio && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Current bio</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 border border-gray-100 dark:border-gray-700">
                      {audit.current_bio}
                    </p>
                  </div>
                )}

                {/* What to change */}
                {hasIssues && (
                  <div>
                    <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">What to fix</p>
                    <ul className="space-y-1">
                      {audit.what_to_change.map((item, i) => (
                        <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex gap-2">
                          <span className="text-amber-400 flex-shrink-0">→</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommended bio */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Recommended bio</p>
                  <div className="flex gap-2 items-start">
                    <p className="text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 border border-gray-100 dark:border-gray-700 flex-1">
                      {audit.recommended_bio}
                    </p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(audit.recommended_bio);
                      }}
                      className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline whitespace-nowrap mt-2"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Website row */}
      <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 flex items-center gap-3">
        <span className="text-base w-6 text-center flex-shrink-0">🌐</span>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">Website</span>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{siteUrl}</p>
        </div>
        <a
          href={siteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline flex-shrink-0"
        >
          Open ↗
        </a>
      </div>

      {/* Run audit CTA */}
      <div className="pt-1">
        {auditError && (
          <p className="text-xs text-red-500 mb-2">{auditError}</p>
        )}
        {!auditResults ? (
          <button
            onClick={runAudit}
            disabled={auditing || connections.length === 0}
            className="w-full rounded-xl border border-dashed border-brand-300 dark:border-brand-700 py-3 text-sm font-semibold text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {auditing
              ? "Checking your profiles…"
              : connections.length === 0
              ? "Connect a platform to check your profiles"
              : "Check all profiles for optimization tips"}
          </button>
        ) : (
          <button
            onClick={runAudit}
            disabled={auditing}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            {auditing ? "Re-checking…" : "Re-check profiles"}
          </button>
        )}
      </div>

      {/* Calendar CTA if no content yet */}
      <div className="mt-2">
        <Link
          href={`/sites/${siteId}/social`}
          className="flex items-center justify-between rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
        >
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">View posting calendar</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">See your full 30-day schedule and generate content</p>
          </div>
          <span className="text-gray-400 group-hover:translate-x-0.5 transition-transform text-sm">→</span>
        </Link>
      </div>
    </div>
  );
}
