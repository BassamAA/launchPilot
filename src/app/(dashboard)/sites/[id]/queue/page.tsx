"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { getPersonaChannelOrder } from "@/lib/onboarding";
import { ContentItem, ContentChannel, OnboardingPersona, Site } from "@/types";
import { ContentCard } from "@/components/content/ContentCard";
import { Button, Badge, Spinner, EmptyState, cn } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import {
  QueueListIcon,
  CheckIcon,
  FunnelIcon,
  BoltIcon,
  ArrowPathIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

const CHANNELS: Array<{ value: ContentChannel | "all"; label: string; emoji: string }> = [
  { value: "all", label: "All", emoji: "" },
  { value: "blog", label: "Blog", emoji: "✍️" },
  { value: "twitter", label: "Twitter", emoji: "𝕏" },
  { value: "linkedin", label: "LinkedIn", emoji: "💼" },
  { value: "reddit", label: "Reddit", emoji: "🔴" },
  { value: "email", label: "Email", emoji: "📧" },
  { value: "directory", label: "Directories", emoji: "📋" },
];

export default function QueuePage() {
  const params = useParams();
  const siteId = params.id as string;
  const { toast } = useToast();

  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<ContentChannel | "all">("all");
  const [bulkApproving, setBulkApproving] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [persona, setPersona] = useState<OnboardingPersona | null>(null);
  const [generatingBatch, setGeneratingBatch] = useState(false);

  useEffect(() => {
    fetch(`/api/sites/${siteId}`)
      .then((response) => response.json())
      .then((site: Site) => setPersona((site.onboarding_json?.persona as OnboardingPersona | undefined) || null))
      .catch(() => setPersona(null));
  }, [siteId]);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const channelParam = selectedChannel !== "all" ? `&channel=${selectedChannel}` : "";
      const res = await fetch(
        `/api/sites/${siteId}/queue?status=draft&page=${page}&limit=20${channelParam}`
      );
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setTotal(data.total || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [siteId, selectedChannel, page]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  async function handleApprove(id: string, editedBody?: string) {
    const res = await fetch("/api/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content_item_id: id, edited_body: editedBody }),
    });
    const payload = await res.json().catch(() => ({}));
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      setTotal((prev) => prev - 1);
      if (payload.redirect_url && payload.redirect_url.startsWith("/")) {
        toast(payload.message || "Content approved. Opening next step.", "success");
        window.location.href = payload.redirect_url;
        return;
      }

      if (payload.status === "published") {
        toast("Approved and published.", "success");
      } else if (payload.status === "scheduled") {
        toast("Approved and queued for scheduled publishing.", "success");
      } else if (payload.status === "ready_to_publish") {
        toast("Approved. Use Publish Now from All Content.", "success");
      } else {
        toast(payload.message || "Content approved!", "success");
      }
    } else {
      if (payload.redirect_url && payload.redirect_url.startsWith("/")) {
        toast(payload.error || "Connect the required integration first.", "error");
        window.location.href = payload.redirect_url;
        return;
      }

      toast(payload.error || "Failed to approve. Try again.", "error");
    }
  }

  async function handleReject(id: string) {
    const res = await fetch("/api/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content_item_id: id }),
    });
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      setTotal((prev) => prev - 1);
      toast("Content rejected.", "info");
    } else {
      toast("Failed to reject. Try again.", "error");
    }
  }

  async function handleGenerate(id: string) {
    setGeneratingId(id);
    try {
      const res = await fetch("/api/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_item_id: id }),
      });
      if (res.ok) {
        toast("Content generated!", "success");
        await fetchQueue();
      } else {
        toast("Generation failed. Try again.", "error");
      }
    } finally {
      setGeneratingId(null);
    }
  }

  async function handleRegenerate(id: string) {
    setGeneratingId(id);
    try {
      const res = await fetch("/api/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_item_id: id }),
      });
      if (res.ok) {
        toast("Content regenerated!", "success");
        await fetchQueue();
      } else {
        toast("Regeneration failed. Try again.", "error");
      }
    } finally {
      setGeneratingId(null);
    }
  }

  async function handleGenerateBatch() {
    setGeneratingBatch(true);
    try {
      // Fetch or create the plan, then bulk-generate
      const planRes = await fetch(`/api/sites/${siteId}/plan`);
      const planPayload = await planRes.json();
      let planId = planPayload?.plan?.id as string | undefined;

      if (!planId) {
        const genRes = await fetch("/api/generate-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ site_id: siteId }),
        });
        const genPayload = await genRes.json().catch(() => ({}));
        if (!genRes.ok) {
          toast(genPayload.error || "Failed to generate plan.", "error");
          return;
        }
        planId = genPayload.plan_id;
      }

      if (planId) {
        await fetch("/api/bulk-generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan_id: planId }),
        });
      }

      toast("Content generated — review it below.", "success");
      await fetchQueue();
    } catch {
      toast("Something went wrong. Try again.", "error");
    } finally {
      setGeneratingBatch(false);
    }
  }

  async function handleBulkApprove() {
    setBulkApproving(true);
    const autoItems = items.filter((i) => i.auto_executable && i.body);
    let approved = 0;
    let failed = 0;
    await Promise.all(
      autoItems.map(async (i) => {
        try {
          const res = await fetch("/api/approve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content_item_id: i.id }),
          });
          if (res.ok) approved++;
          else failed++;
        } catch {
          failed++;
        }
      })
    );
    await fetchQueue();
    if (failed > 0) {
      toast(`Approved ${approved}, ${failed} failed — try those individually`, "error");
    } else {
      toast(`Bulk approved ${approved} item${approved !== 1 ? "s" : ""}`, "success");
    }
    setBulkApproving(false);
  }

  const autoExecutableCount = items.filter((i) => i.auto_executable && i.body).length;
  const needsGenerationCount = items.filter((i) => !i.body).length;
  const preferredOrder = getPersonaChannelOrder(persona);
  const orderedChannels = [
    CHANNELS[0],
    ...CHANNELS.slice(1).sort((a, b) => preferredOrder.indexOf(a.value as ContentChannel) - preferredOrder.indexOf(b.value as ContentChannel)),
  ];
  const emptyDescription =
    persona === "creator"
      ? "Your creator setup is ready. Generate or approve social content to start learning what resonates."
      : persona === "service_provider"
        ? "Your service-business queue is clear. Generate outreach and trust-building content when you’re ready."
        : total === 0
          ? "No content generated yet — generate your plan first"
          : "All done for this filter";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Review & Publish</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {total > 0 ? `${total} piece${total !== 1 ? "s" : ""} ready for your review` : "Nothing waiting — you're all caught up"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {autoExecutableCount > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleBulkApprove}
              loading={bulkApproving}
            >
              <CheckIcon className="w-4 h-4" />
              Approve {autoExecutableCount} auto-items
            </Button>
          )}
        </div>
      </div>

      {/* Needs-content banner */}
      {needsGenerationCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-amber-900 text-sm">
              {needsGenerationCount} item{needsGenerationCount !== 1 && "s"} still need content
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Use the Generate button on each card, or go to your plan to bulk-generate.
            </p>
          </div>
          <BoltIcon className="w-5 h-5 text-amber-500 flex-shrink-0" />
        </div>
      )}

      {/* Channel filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <FunnelIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
        {orderedChannels.map(({ value, label, emoji }) => (
          <button
            key={value}
            onClick={() => { setSelectedChannel(value); setPage(1); }}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
              selectedChannel === value
                ? "bg-brand-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {emoji && <span className="mr-1">{emoji}</span>}
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <QueueListIcon className="w-7 h-7 text-gray-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">Queue is clear</h3>
          <p className="text-sm text-gray-500 max-w-sm mb-6">{emptyDescription}</p>
          {total === 0 && (
            <Button onClick={handleGenerateBatch} loading={generatingBatch}>
              <SparklesIcon className="w-4 h-4" />
              Generate content
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {items.map((item) => (
              <ContentCard
                key={item.id}
                item={item}
                onApprove={handleApprove}
                onReject={handleReject}
                onGenerate={!item.body ? () => handleGenerate(item.id) : undefined}
                onRegenerate={item.body ? () => handleRegenerate(item.id) : undefined}
                generating={generatingId === item.id}
              />
            ))}
          </div>

          {/* Pagination */}
          {total > 20 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="px-3 py-1.5 text-sm text-gray-500">
                Page {page} of {Math.ceil(total / 20)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(total / 20)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
