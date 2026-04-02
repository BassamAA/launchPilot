"use client";

import Link from "next/link";

interface Connection {
  platform: string;
  account_name: string | null;
  account_id: string | null;
  connected_at: string | null;
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
    connectHref: (siteId: string) => `/api/auth/twitter?site_id=${siteId}`,
    connectLabel: "Connect X account",
    description: "Fastest social channel for founder-led distribution",
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    icon: "in",
    color: "text-blue-600",
    connectHref: (siteId: string) => `/api/auth/linkedin?siteId=${siteId}`,
    connectLabel: "Connect LinkedIn",
    description: "Useful for B2B products and professional distribution",
  },
];

export function PresencePanel({ siteId, siteUrl, connections }: PresencePanelProps) {
  const connectedMap = Object.fromEntries(connections.map((c) => [c.platform, c]));

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-brand-100 bg-brand-50/50 px-4 py-4">
        <p className="text-sm font-semibold text-gray-900">Recommended order</p>
        <p className="mt-1 text-sm text-gray-600">
          Start with your website and the queue. Then connect X or LinkedIn if you want direct publishing. You do not need every social platform before LaunchPilot becomes useful.
        </p>
      </div>

      {PLATFORMS.map((p) => {
        const conn = connectedMap[p.key];

        return (
          <div
            key={p.key}
            className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <span className={`text-base font-black w-6 text-center flex-shrink-0 ${p.color}`}>
                {p.icon}
              </span>

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
                </div>

                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {conn ? "Publishing available when you are ready." : p.description}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {conn ? (
                  <Link
                    href={`/sites/${siteId}/queue`}
                    className="text-xs font-semibold bg-brand-500 text-white px-3 py-1.5 rounded-lg hover:bg-brand-600 transition-colors"
                  >
                    Open queue
                  </Link>
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
          </div>
        );
      })}

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

      <div className="mt-2">
        <Link
          href={`/sites/${siteId}/plan`}
          className="flex items-center justify-between rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
        >
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Review your 30-day plan</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Decide what to generate next, then move into the queue</p>
          </div>
          <span className="text-gray-400 group-hover:translate-x-0.5 transition-transform text-sm">→</span>
        </Link>
      </div>
    </div>
  );
}
