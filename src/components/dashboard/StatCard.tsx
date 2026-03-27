"use client";

import { cn } from "@/components/ui";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  color?: "indigo" | "green" | "amber" | "coral";
  className?: string;
}

const colorMap = {
  indigo: "bg-brand-50 text-brand-600",
  green: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  coral: "bg-orange-50 text-orange-600",
};

export function StatCard({ label, value, icon, trend, color = "indigo", className }: StatCardProps) {
  return (
    <div className={cn("bg-white rounded-xl border border-gray-100 shadow-card p-6", className)}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", colorMap[color])}>
          {icon}
        </div>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-3xl font-bold text-gray-900">
          {typeof value === "number" ? value.toLocaleString() : value}
        </span>
        {trend && (
          <span className="text-xs text-emerald-600 font-medium">
            +{trend.value} {trend.label}
          </span>
        )}
      </div>
    </div>
  );
}
