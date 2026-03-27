"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { PencilIcon, CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface EditProfileNameProps {
  currentName: string;
}

export function EditProfileName({ currentName }: EditProfileNameProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(currentName);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) throw new Error("Failed");
      toast("Name updated.", "success");
      setEditing(false);
      router.refresh();
    } catch {
      toast("Failed to update name. Try again.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700">
        <span className="text-sm text-gray-500 dark:text-gray-400">Name</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{currentName || "—"}</span>
          <button
            onClick={() => setEditing(true)}
            className="p-1 text-gray-400 hover:text-brand-600 transition-colors"
            title="Edit name"
          >
            <PencilIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 py-2 border-b border-gray-50 dark:border-gray-700">
      <span className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">Name</span>
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="flex-1"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") { setEditing(false); setName(currentName); }
        }}
      />
      <Button variant="primary" size="sm" onClick={handleSave} loading={saving}>
        <CheckIcon className="w-3.5 h-3.5" />
      </Button>
      <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setName(currentName); }}>
        <XMarkIcon className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
