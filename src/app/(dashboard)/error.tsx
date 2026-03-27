"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/monitoring";
import { Button } from "@/components/ui";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
    reportClientError({
      source: "dashboard_error_boundary",
      message: error.message,
      stack: error.stack,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-6">
        <ExclamationTriangleIcon className="w-7 h-7 text-red-500" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
      <p className="text-gray-500 text-sm max-w-sm mb-6">
        An unexpected error occurred. If this keeps happening, try refreshing or contact support.
      </p>
      <div className="flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" onClick={() => window.location.href = "/sites"}>
          Back to sites
        </Button>
      </div>
      {process.env.NODE_ENV === "development" && (
        <pre className="mt-6 text-xs text-left bg-gray-50 rounded-lg p-4 max-w-lg overflow-auto text-red-600">
          {error.message}
        </pre>
      )}
    </div>
  );
}
