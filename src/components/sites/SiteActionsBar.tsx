"use client";

import Link from "next/link";
import { Button } from "@/components/ui";
import { ArrowRightIcon, BoltIcon, CheckCircleIcon } from "@heroicons/react/24/outline";

interface SiteActionsBarProps {
  siteId: string;
  briefConfirmed: boolean;
  hasBrief: boolean;
  totalGenerated: number;
  pendingApproval: number;
  needsGeneration: number;
}

export function SiteActionsBar({
  siteId,
  briefConfirmed,
  hasBrief,
  totalGenerated,
  pendingApproval,
  needsGeneration,
}: SiteActionsBarProps) {
  // Determine which prompt to show (only the most important one)
  if (!hasBrief) return null;

  if (!briefConfirmed) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-amber-900 text-sm">Review your marketing brief</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Confirm your brief to unlock your growth strategy and execution plan
          </p>
        </div>
        <Link href={`/sites/${siteId}/brief`} className="flex-shrink-0">
          <Button variant="secondary" size="sm">
            Review brief <ArrowRightIcon className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>
    );
  }

  if (briefConfirmed && totalGenerated === 0) {
    return (
      <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-brand-900 text-sm">Ready to generate your plan</p>
          <p className="text-xs text-brand-700 mt-0.5">
            Your brief is confirmed — generate your growth strategy and 30-day execution plan
          </p>
        </div>
        <Link href={`/sites/${siteId}/plan`} className="flex-shrink-0">
          <Button size="sm">
            <BoltIcon className="w-3.5 h-3.5" />
            Generate plan
          </Button>
        </Link>
      </div>
    );
  }

  if (pendingApproval > 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-emerald-900 text-sm">
            {pendingApproval} piece{pendingApproval !== 1 && "s"} ready to review
          </p>
          <p className="text-xs text-emerald-700 mt-0.5">
            Your content is ready — approve to start publishing
          </p>
        </div>
        <Link href={`/sites/${siteId}/queue`} className="flex-shrink-0">
          <Button size="sm">
            <CheckCircleIcon className="w-3.5 h-3.5" />
            Review queue
          </Button>
        </Link>
      </div>
    );
  }

  return null;
}
