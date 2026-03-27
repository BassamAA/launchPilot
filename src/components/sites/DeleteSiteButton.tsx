"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { TrashIcon } from "@heroicons/react/24/outline";

interface DeleteSiteButtonProps {
  siteId: string;
  siteName: string;
}

export function DeleteSiteButton({ siteId, siteName }: DeleteSiteButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/sites/${siteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete site");
      toast("Site deleted successfully.", "success");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast("Failed to delete site. Please try again.", "error");
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (!confirming) {
    return (
      <Button
        variant="danger"
        size="sm"
        onClick={() => setConfirming(true)}
      >
        <TrashIcon className="w-4 h-4" />
        Delete site
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <p className="text-sm font-medium text-red-800">
        Are you sure? This will permanently delete <strong>{siteName}</strong> and all its data.
      </p>
      <div className="flex items-center gap-2">
        <Button variant="danger" size="sm" onClick={handleDelete} loading={deleting}>
          Yes, delete permanently
        </Button>
        <Button variant="outline" size="sm" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
