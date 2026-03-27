"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { CheckIcon, ClipboardDocumentIcon } from "@heroicons/react/24/outline";

interface CopyableTextBlockProps {
  value: string;
  rows?: number;
  className?: string;
}

export function CopyableTextBlock({
  value,
  rows = 6,
  className = "",
}: CopyableTextBlockProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast("Copied to clipboard", "success");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast("Failed to copy text", "error");
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={handleCopy}>
          {copied ? <CheckIcon className="h-4 w-4" /> : <ClipboardDocumentIcon className="h-4 w-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <textarea
        readOnly
        rows={rows}
        value={value}
        className={`w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-3 text-sm leading-6 text-gray-800 dark:text-gray-100 resize-y ${className}`}
      />
    </div>
  );
}
