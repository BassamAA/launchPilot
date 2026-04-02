"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/components/ui";
import { SparklesIcon, ArrowRightIcon } from "@heroicons/react/24/solid";

export function HeroDemo() {
  const router = useRouter();
  const [url, setUrl] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    router.push(`/signup?url=${encodeURIComponent(url)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-stretch gap-2.5 max-w-2xl mx-auto">
      <div className="flex-1 relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </div>
        <input
          type="url"
          placeholder="https://your-saas.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className={cn(
            "w-full pl-12 pr-4 py-5 rounded-xl border border-gray-200 text-base",
            "focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400",
            "placeholder:text-gray-400 bg-white shadow-card"
          )}
        />
      </div>
      <button
        type="submit"
        className="flex items-center justify-center gap-2 px-8 py-5 bg-brand-500 text-white text-base font-semibold rounded-xl shadow-brand hover:bg-brand-600 transition-colors whitespace-nowrap"
      >
        <SparklesIcon className="w-5 h-5" />
        Build my plan
        <ArrowRightIcon className="w-5 h-5" />
      </button>
    </form>
  );
}
