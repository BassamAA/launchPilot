"use client";

import Link from "next/link";
import { PriorityAction } from "@/lib/priority-actions";
import {
  ArrowRightIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

interface PriorityActionsBarProps {
  actions: PriorityAction[];
}

const URGENCY_STYLES = {
  high: {
    bar: "border-amber-200 bg-amber-50",
    icon: "text-amber-500",
    text: "text-amber-900",
    sub: "text-amber-700",
    cta: "text-amber-700 hover:text-amber-900 font-semibold",
    dot: "bg-amber-400",
  },
  medium: {
    bar: "border-brand-200 bg-brand-50",
    icon: "text-brand-500",
    text: "text-brand-900",
    sub: "text-brand-700",
    cta: "text-brand-700 hover:text-brand-900 font-semibold",
    dot: "bg-brand-400",
  },
  low: {
    bar: "border-gray-200 bg-gray-50",
    icon: "text-gray-400",
    text: "text-gray-800",
    sub: "text-gray-500",
    cta: "text-gray-600 hover:text-gray-900 font-semibold",
    dot: "bg-gray-300",
  },
};

export function PriorityActionsBar({ actions }: PriorityActionsBarProps) {
  if (actions.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        Priority Actions
      </p>
      <div className="grid gap-2 md:grid-cols-1">
        {actions.map((action) => {
          const s = URGENCY_STYLES[action.urgency];
          const Icon =
            action.urgency === "high"
              ? ExclamationTriangleIcon
              : InformationCircleIcon;

          return (
            <div
              key={action.id}
              className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 ${s.bar}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon className={`w-4 h-4 flex-shrink-0 ${s.icon}`} />
                <p className={`text-sm ${s.text} leading-snug`}>
                  {action.message}
                </p>
              </div>
              <Link
                href={action.href}
                className={`flex items-center gap-1 text-sm whitespace-nowrap ${s.cta}`}
              >
                {action.cta}
                <ArrowRightIcon className="w-3.5 h-3.5" />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
