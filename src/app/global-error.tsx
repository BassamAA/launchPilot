"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui";
import { reportClientError } from "@/lib/monitoring";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError({
      source: "global_error_boundary",
      message: error.message,
      stack: error.stack,
      digest: error.digest,
    });
  }, [error]);

  return (
    <html>
      <body className="bg-slate-50 text-slate-900">
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              LaunchPilot
            </p>
            <h1 className="mt-3 text-2xl font-bold">Something went wrong</h1>
            <p className="mt-3 text-sm text-slate-500">
              A runtime error was captured. Try again, and if it repeats, check the latest logs.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button onClick={reset}>Try again</Button>
              <Button variant="outline" onClick={() => (window.location.href = "/")}>
                Go home
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
