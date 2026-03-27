"use client";

import Link from "next/link";
import { buildPersonaSummary, sortLabelsForPersona } from "@/lib/onboarding";
import { usePathname } from "next/navigation";
import { Site } from "@/types";
import { cn } from "@/components/ui";
import { BRAND_NAME } from "@/lib/brand";
import {
  HomeIcon,
  DocumentTextIcon,
  CalendarIcon,
  Squares2X2Icon,
  QueueListIcon,
  BoltIcon,
  ChartBarIcon,
  SparklesIcon,
  ClockIcon,
  Cog6ToothIcon,
  LinkIcon,
  PlusCircleIcon,
  ChevronDownIcon,
  RocketLaunchIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";

interface SidebarProps {
  sites: Site[];
  pendingCountBySite?: Record<string, number>;
}

export function Sidebar({ sites, pendingCountBySite = {} }: SidebarProps) {
  const pathname = usePathname();
  const [sitesOpen, setSitesOpen] = useState(true);

  // Extract current site ID from pathname: /sites/[id]/...
  const siteMatch = pathname.match(/^\/sites\/([^/]+)/);
  const currentSiteId = siteMatch ? siteMatch[1] : null;
  // Exclude "new" from being treated as a site ID
  const activeSiteId = currentSiteId === "new" ? null : currentSiteId;

  const currentSite = sites.find((s) => s.id === activeSiteId);
  const currentPersona = currentSite ? buildPersonaSummary(currentSite).persona : null;

  function getSiteHostname(site: Site): string {
    try {
      const url = site.url.startsWith("http") ? site.url : `https://${site.url}`;
      return new URL(url).hostname;
    } catch {
      return site.url;
    }
  }

  const siteNav = activeSiteId
    ? sortLabelsForPersona([
        {
          label: "Dashboard",
          href: `/sites/${activeSiteId}`,
          icon: <HomeIcon className="w-4 h-4" />,
          exact: true,
        },
        {
          label: "Product Brief",
          href: `/sites/${activeSiteId}/brief`,
          icon: <DocumentTextIcon className="w-4 h-4" />,
        },
        {
          label: "Content Plan",
          href: `/sites/${activeSiteId}/plan`,
          icon: <CalendarIcon className="w-4 h-4" />,
        },
        {
          label: "Where to Publish",
          href: `/sites/${activeSiteId}/surfaces`,
          icon: <Squares2X2Icon className="w-4 h-4" />,
        },
        {
          label: "Review & Publish",
          href: `/sites/${activeSiteId}/queue`,
          icon: <QueueListIcon className="w-4 h-4" />,
        },
        {
          label: "Content Library",
          href: `/sites/${activeSiteId}/content`,
          icon: <BoltIcon className="w-4 h-4" />,
        },
        {
          label: "Results",
          href: `/sites/${activeSiteId}/performance`,
          icon: <ChartBarIcon className="w-4 h-4" />,
        },
        {
          label: "Social",
          href: `/sites/${activeSiteId}/social`,
          icon: <SparklesIcon className="w-4 h-4" />,
        },
        {
          label: "History",
          href: `/sites/${activeSiteId}/activity`,
          icon: <ClockIcon className="w-4 h-4" />,
        },
        {
          label: "Connections",
          href: `/sites/${activeSiteId}/settings`,
          icon: <LinkIcon className="w-4 h-4" />,
        },
      ], currentPersona)
    : [];

  function isActive(href: string, exact = false) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside className="w-60 flex-shrink-0 h-screen sticky top-0 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-gray-100 dark:border-gray-700">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
            <RocketLaunchIcon className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 dark:text-white text-lg">{BRAND_NAME}</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {/* Sites list */}
        <div>
          <button
            onClick={() => setSitesOpen(!sitesOpen)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <span>Sites</span>
            <ChevronDownIcon
              className={cn(
                "w-3.5 h-3.5 transition-transform duration-200",
                sitesOpen && "rotate-180"
              )}
            />
          </button>

          {sitesOpen && (
            <div className="mt-1 space-y-0.5">
              {sites.map((site) => {
                const sitePending = pendingCountBySite[site.id] || 0;
                return (
                  <Link
                    key={site.id}
                    href={`/sites/${site.id}`}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                      site.id === activeSiteId
                        ? "bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 font-medium"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
                    )}
                  >
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full flex-shrink-0",
                        site.status === "active" && "bg-emerald-400",
                        site.status === "analyzing" && "bg-amber-400 animate-pulse",
                        site.status === "error" && "bg-red-400",
                        site.status === "paused" && "bg-gray-300"
                      )}
                    />
                    <span className="truncate flex-1">
                      {site.name && site.name !== "" ? site.name : getSiteHostname(site)}
                    </span>
                    {sitePending > 0 && (
                      <span className="ml-auto min-w-[1.25rem] h-5 px-1 flex items-center justify-center rounded-full bg-amber-400 text-white text-xs font-bold leading-none flex-shrink-0">
                        {sitePending > 99 ? "99+" : sitePending}
                      </span>
                    )}
                  </Link>
                );
              })}

              <Link
                href="/sites/new"
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                  pathname === "/sites/new"
                    ? "bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300"
                    : "text-gray-400 dark:text-gray-500 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20"
                )}
              >
                <PlusCircleIcon className="w-4 h-4" />
                Add site
              </Link>
            </div>
          )}
        </div>

        {/* Site-specific nav */}
        {currentSite && siteNav.length > 0 && (
          <div className="mt-4">
            <p className="px-3 py-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide truncate">
              {currentSite.name || getSiteHostname(currentSite)}
            </p>
            <div className="mt-1 space-y-0.5">
              {siteNav.map((item) => {
                const isQueue = item.href.endsWith("/queue");
                const pendingCount = isQueue && activeSiteId ? (pendingCountBySite[activeSiteId] || 0) : 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                      isActive(item.href, item.exact)
                        ? "bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 font-medium"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
                    )}
                  >
                    {item.icon}
                    <span className="flex-1">{item.label}</span>
                    {pendingCount > 0 && (
                      <span className="ml-auto min-w-[1.25rem] h-5 px-1 flex items-center justify-center rounded-full bg-amber-400 text-white text-xs font-bold leading-none">
                        {pendingCount > 99 ? "99+" : pendingCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-gray-100 dark:border-gray-700">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
            pathname.startsWith("/settings")
              ? "bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
          )}
        >
          <Cog6ToothIcon className="w-4 h-4" />
          Settings & Billing
        </Link>
      </div>
    </aside>
  );
}
