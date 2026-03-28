"use client";

import { useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { cn } from "@/components/ui";

interface StrategyAccordionProps {
  title: string;
  children: React.ReactNode;
}

export function StrategyAccordion({ title, children }: StrategyAccordionProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-900 dark:text-white">{title}</span>
        <ChevronDownIcon
          className={cn(
            "w-4 h-4 text-gray-400 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div className="border-t border-gray-100 dark:border-gray-700 p-5">
          {children}
        </div>
      )}
    </div>
  );
}
