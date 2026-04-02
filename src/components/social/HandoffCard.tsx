"use client";

import { useState } from "react";
import { ChannelHandoff } from "@/lib/channel-publishing";

export function HandoffCard({
  handoff,
  text,
}: {
  handoff: ChannelHandoff;
  text: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">{handoff.label}</p>
          <p className="text-xs text-gray-500 mt-1">{handoff.fallbackHint}</p>
        </div>
        {handoff.supportsPrefill ? (
          <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">
            Prefill
          </span>
        ) : (
          <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-700">
            Best effort
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {handoff.url && (
          <a
            href={handoff.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              if (handoff.shouldCopyBeforeOpen) {
                navigator.clipboard.writeText(text).catch(() => {});
              }
            }}
            className="inline-flex items-center rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition-colors"
          >
            {handoff.actionLabel}
          </a>
        )}

        <button
          onClick={copy}
          className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          {copied ? "Copied" : "Copy draft"}
        </button>
      </div>
    </div>
  );
}
