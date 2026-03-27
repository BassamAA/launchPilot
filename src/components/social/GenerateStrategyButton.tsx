"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Spinner } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { ArrowPathIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { SocialStrategyPlatform } from "@/lib/social-strategy";

interface GenerateStrategyButtonProps {
  siteId: string;
  platform: SocialStrategyPlatform;
  hasExisting: boolean;
}

function getPlatformLabel(platform: SocialStrategyPlatform) {
  return platform.charAt(0).toUpperCase() + platform.slice(1);
}

export function GenerateStrategyButton({
  siteId,
  platform,
  hasExisting,
}: GenerateStrategyButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    try {
      setLoading(true);

      const response = await fetch(`/api/sites/${siteId}/social-strategy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Failed to generate strategy");
      }

      toast(`${getPlatformLabel(platform)} strategy ready`, "success");
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to generate strategy", "error");
    } finally {
      setLoading(false);
    }
  }

  if (hasExisting) {
    return (
      <Button variant="ghost" size="sm" onClick={handleGenerate} disabled={loading}>
        {loading ? <Spinner className="h-4 w-4" /> : <ArrowPathIcon className="h-4 w-4" />}
        {loading ? "Generating..." : "Regenerate"}
      </Button>
    );
  }

  return (
    <Button
      variant="primary"
      size="lg"
      onClick={handleGenerate}
      disabled={loading}
      className="min-w-[260px]"
    >
      {loading ? <Spinner className="h-5 w-5 text-white" /> : <SparklesIcon className="h-5 w-5" />}
      {loading
        ? "Generating... this takes 20-30 seconds"
        : `Generate ${getPlatformLabel(platform)} Strategy`}
    </Button>
  );
}
