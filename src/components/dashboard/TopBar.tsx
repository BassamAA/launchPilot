"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, Badge, cn } from "@/components/ui";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  UserIcon,
} from "@heroicons/react/24/outline";

interface TopBarProps {
  user: {
    name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
    subscription_tier?: string;
  };
  title?: string;
  /** When true, renders only the right-side controls (no wrapper div, no h-14, no border) */
  compact?: boolean;
}

export function TopBar({ user, title, compact }: TopBarProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const displayName = user.name || user.email?.split("@")[0] || "User";
  const tierLabels: Record<string, string> = {
    free_trial: "Free Trial",
    starter: "Starter",
    growth: "Growth",
    agency: "Agency",
  };
  const tierVariants: Record<string, "default" | "info" | "success" | "purple"> = {
    free_trial: "default",
    starter: "info",
    growth: "success",
    agency: "purple",
  };

  const rightControls = (
    <div className="flex items-center gap-3">
      <ThemeToggle />
      {user.subscription_tier && (
        <Badge variant={tierVariants[user.subscription_tier] || "default"}>
          {tierLabels[user.subscription_tier] || user.subscription_tier}
        </Badge>
      )}

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 hover:bg-gray-50 rounded-lg px-2 py-1.5 transition-colors"
        >
          <Avatar name={displayName} src={user.avatar_url} size="sm" />
          <span className="text-sm font-medium text-gray-700 hidden sm:block">
            {displayName}
          </span>
          <ChevronDownIcon className={cn("w-3.5 h-3.5 text-gray-400 transition-transform", menuOpen && "rotate-180")} />
        </button>

        {menuOpen && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            {/* Menu */}
            <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl border border-gray-100 shadow-card-hover z-20 py-1 overflow-hidden animate-fade-in">
              <div className="px-4 py-3 border-b border-gray-50">
                <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
              </div>
              <Link
                href="/settings"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Cog6ToothIcon className="w-4 h-4" />
                Settings
              </Link>
              <Link
                href="/settings/billing"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <UserIcon className="w-4 h-4" />
                Billing & Plan
              </Link>
              <div className="border-t border-gray-50 mt-1">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <ArrowRightOnRectangleIcon className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  if (compact) {
    return rightControls;
  }

  return (
    <div className="h-14 border-b border-gray-100 bg-white flex items-center justify-between px-6 flex-shrink-0">
      {title ? <h1 className="font-semibold text-gray-900">{title}</h1> : <div />}
      {rightControls}
    </div>
  );
}
