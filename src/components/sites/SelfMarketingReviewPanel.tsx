"use client";

import { useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { ContentItem } from "@/types";

interface SelfMarketingReviewPanelProps {
  items: ContentItem[];
}

export function SelfMarketingReviewPanel({ items: initialItems }: SelfMarketingReviewPanelProps) {
  const { toast } = useToast();
  const [items, setItems] = useState(initialItems);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function review(id: string, action: "approve" | "reject") {
    setLoadingId(id);
    try {
      const res = await fetch(action === "approve" ? "/api/approve" : "/api/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_item_id: id }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || `Failed to ${action} content`);
      setItems((current) => current.filter((item) => item.id !== id));
      toast(action === "approve" ? "Content approved." : "Content rejected.", action === "approve" ? "success" : "info");
    } catch (error) {
      toast(error instanceof Error ? error.message : `Failed to ${action} content.`, "error");
    } finally {
      setLoadingId(null);
    }
  }

  if (items.length === 0) {
    return (
      <Card padding="md">
        <p className="text-sm text-gray-500">No self-marketing items currently need manual review.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={item.id} padding="md">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                <Badge variant="info" className="capitalize">
                  {item.channel}
                </Badge>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">
                {item.body || "No content generated yet."}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button size="sm" onClick={() => review(item.id, "approve")} loading={loadingId === item.id}>
                Approve
              </Button>
              <Button size="sm" variant="outline" onClick={() => review(item.id, "reject")} loading={loadingId === item.id}>
                Reject
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
