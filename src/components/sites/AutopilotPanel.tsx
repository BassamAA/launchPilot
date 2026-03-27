"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { BoltIcon, CheckCircleIcon, InformationCircleIcon } from "@heroicons/react/24/outline";

interface AutopilotPanelProps {
  siteId: string;
  autopilotEnabled: boolean;
  twitterConnected: boolean;
}

export function AutopilotPanel({ siteId, autopilotEnabled, twitterConnected }: AutopilotPanelProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(autopilotEnabled);
  const [saving, setSaving] = useState(false);

  async function toggle() {
    const next = !enabled;
    setSaving(true);
    try {
      const res = await fetch(`/api/sites/${siteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autopilot_enabled: next }),
      });
      if (!res.ok) throw new Error("Failed");
      setEnabled(next);
      toast(
        next ? "Autopilot enabled — content will publish automatically." : "Autopilot paused.",
        "success"
      );
      router.refresh();
    } catch {
      toast("Failed to update autopilot setting.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`rounded-xl border p-6 transition-colors ${
      enabled
        ? "border-brand-300 dark:border-brand-700 bg-brand-50/40 dark:bg-brand-900/20"
        : "border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800"
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
            enabled ? "bg-brand-500" : "bg-gray-100 dark:bg-gray-700"
          }`}>
            <BoltIcon className={`w-4 h-4 ${enabled ? "text-white" : "text-gray-400 dark:text-gray-500"}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-gray-900 dark:text-white">Autopilot Mode</h2>
              {enabled && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-brand-500 text-white">
                  ACTIVE
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Generate, approve, and publish content automatically — no queue needed.
            </p>
          </div>
        </div>

        {/* Toggle */}
        <button
          onClick={toggle}
          disabled={saving}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 ${
            enabled ? "bg-brand-500" : "bg-gray-200 dark:bg-gray-600"
          }`}
          role="switch"
          aria-checked={enabled}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              enabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* What autopilot does */}
      <div className="mt-5 space-y-2">
        {[
          { label: "Generates content bodies daily (6am UTC)", done: true },
          {
            label: `Publishes blog posts automatically`,
            done: true,
          },
          {
            label: twitterConnected
              ? "Tweets automatically (Twitter connected)"
              : "Tweets automatically — connect Twitter to activate",
            done: twitterConnected,
            warn: !twitterConnected,
          },
        ].map((item, i) => (
          <div key={i} className="flex items-start gap-2.5 text-sm">
            <CheckCircleIcon
              className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                item.warn
                  ? "text-amber-400"
                  : item.done
                  ? "text-emerald-500"
                  : "text-gray-300 dark:text-gray-600"
              }`}
            />
            <span className={item.warn ? "text-amber-700 dark:text-amber-400" : "text-gray-600 dark:text-gray-300"}>
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* Info note */}
      {enabled && (
        <div className="mt-4 flex items-start gap-2 text-xs text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/30 rounded-lg px-3 py-2">
          <InformationCircleIcon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>
            Content respects scheduled dates — future-dated items queue automatically and publish when the date arrives.
            Reddit and email still require manual review.
          </span>
        </div>
      )}
    </div>
  );
}
