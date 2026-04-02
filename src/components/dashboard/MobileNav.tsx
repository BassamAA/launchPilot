"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Site } from "@/types";
import { cn } from "@/components/ui";
import { BRAND_NAME } from "@/lib/brand";
import {
  Bars3Icon,
  XMarkIcon,
  RocketLaunchIcon,
  HomeIcon,
  CalendarIcon,
  QueueListIcon,
  ChartBarIcon,
  SparklesIcon,
  LinkIcon,
  PlusCircleIcon,
  FolderIcon,
} from "@heroicons/react/24/outline";

interface MobileNavProps {
  sites: Site[];
  pendingCountBySite?: Record<string, number>;
}

export function MobileNav({ sites, pendingCountBySite = {} }: MobileNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const siteMatch = pathname.match(/^\/sites\/([^/]+)/);
  const activeSiteId = siteMatch && siteMatch[1] !== "new" ? siteMatch[1] : null;

  function getSiteHostname(site: Site): string {
    try {
      const url = site.url.startsWith("http") ? site.url : `https://${site.url}`;
      return new URL(url).hostname;
    } catch {
      return site.url;
    }
  }

  const siteNav = activeSiteId
    ? [
        { label: "Overview", href: `/sites/${activeSiteId}`, icon: HomeIcon, exact: true },
        { label: "Plan", href: `/sites/${activeSiteId}/plan`, icon: CalendarIcon },
        { label: "Queue", href: `/sites/${activeSiteId}/queue`, icon: QueueListIcon },
        { label: "Library", href: `/sites/${activeSiteId}/content`, icon: FolderIcon },
        { label: "Results", href: `/sites/${activeSiteId}/performance`, icon: ChartBarIcon },
        { label: "Strategy Calendar", href: `/sites/${activeSiteId}/social`, icon: SparklesIcon },
        { label: "Connections", href: `/sites/${activeSiteId}/settings`, icon: LinkIcon },
      ]
    : [];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="md:hidden p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
        aria-label="Open menu"
      >
        <Bars3Icon className="w-5 h-5" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={() => setOpen(false)} />
          <div className="fixed left-0 top-0 bottom-0 w-72 bg-white dark:bg-gray-800 z-50 shadow-2xl flex flex-col md:hidden">
            <div className="h-16 flex items-center justify-between px-5 border-b border-gray-100 dark:border-gray-700">
              <Link href="/sites" onClick={() => setOpen(false)} className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
                  <RocketLaunchIcon className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-gray-900 dark:text-white text-lg">{BRAND_NAME}</span>
              </Link>
              <button onClick={() => setOpen(false)} className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-3 space-y-4">
              <div>
                <p className="px-3 py-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Sites</p>
                <div className="space-y-0.5">
                  {sites.length === 0 ? (
                    <div className="px-3 py-2.5 text-sm text-gray-400 dark:text-gray-500">No sites yet.</div>
                  ) : (
                    sites.map((site) => {
                      const sitePending = pendingCountBySite[site.id] || 0;
                      return (
                        <Link
                          key={site.id}
                          href={`/sites/${site.id}`}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors",
                            site.id === activeSiteId
                              ? "bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 font-medium"
                              : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                          )}
                        >
                          <div className={cn(
                            "w-2 h-2 rounded-full flex-shrink-0",
                            site.status === "active" && "bg-emerald-400",
                            site.status === "analyzing" && "bg-amber-400",
                            site.status === "error" && "bg-red-400",
                            site.status === "paused" && "bg-gray-300"
                          )} />
                          <span className="truncate flex-1">{site.name || getSiteHostname(site)}</span>
                          {sitePending > 0 && (
                            <span className="min-w-[1.25rem] h-5 px-1 flex items-center justify-center rounded-full bg-amber-400 text-white text-xs font-bold leading-none flex-shrink-0">
                              {sitePending > 99 ? "99+" : sitePending}
                            </span>
                          )}
                        </Link>
                      );
                    })
                  )}
                  <Link
                    href="/sites/new"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-gray-400 dark:text-gray-500 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
                  >
                    <PlusCircleIcon className="w-4 h-4" />
                    Add site
                  </Link>
                </div>
              </div>

              {siteNav.length > 0 && (
                <div>
                  <p className="px-3 py-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                    {sites.find((s) => s.id === activeSiteId)?.name || "Site"}
                  </p>
                  <div className="space-y-0.5">
                    {siteNav.map(({ label, href, icon: Icon, exact }) => {
                      const isQueue = href.endsWith("/queue");
                      const pendingCount = isQueue && activeSiteId ? pendingCountBySite[activeSiteId] || 0 : 0;
                      const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
                      return (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors",
                            active
                              ? "bg-gray-900 text-white"
                              : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="truncate flex-1">{label}</span>
                          {pendingCount > 0 && (
                            <span className="min-w-[1.25rem] h-5 px-1 flex items-center justify-center rounded-full bg-amber-400 text-white text-xs font-bold leading-none flex-shrink-0">
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
          </div>
        </>
      )}
    </>
  );
}
