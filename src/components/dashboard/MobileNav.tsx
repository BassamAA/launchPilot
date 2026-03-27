"use client";

import { useState } from "react";
import Link from "next/link";
import { buildPersonaSummary, sortLabelsForPersona } from "@/lib/onboarding";
import { usePathname } from "next/navigation";
import { Site } from "@/types";
import { cn } from "@/components/ui";
import { BRAND_NAME } from "@/lib/brand";
import {
  Bars3Icon,
  XMarkIcon,
  RocketLaunchIcon,
  HomeIcon,
  DocumentTextIcon,
  CalendarIcon,
  Squares2X2Icon,
  QueueListIcon,
  BoltIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/outline";

interface MobileNavProps {
  sites: Site[];
}

export function MobileNav({ sites }: MobileNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const siteMatch = pathname.match(/^\/sites\/([^/]+)/);
  const activeSiteId = siteMatch && siteMatch[1] !== "new" ? siteMatch[1] : null;
  const currentSite = sites.find((site) => site.id === activeSiteId) || null;
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
        { label: "Dashboard", href: `/sites/${activeSiteId}`, icon: HomeIcon },
        { label: "Brief", href: `/sites/${activeSiteId}/brief`, icon: DocumentTextIcon },
        { label: "Plan", href: `/sites/${activeSiteId}/plan`, icon: CalendarIcon },
        { label: "Surfaces", href: `/sites/${activeSiteId}/surfaces`, icon: Squares2X2Icon },
        { label: "Queue", href: `/sites/${activeSiteId}/queue`, icon: QueueListIcon },
        { label: "Content", href: `/sites/${activeSiteId}/content`, icon: BoltIcon },
        { label: "Performance", href: `/sites/${activeSiteId}/performance`, icon: ChartBarIcon },
      ], currentPersona)
    : [];

  return (
    <>
      {/* Mobile hamburger button — shown only on small screens */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
        aria-label="Open menu"
      >
        <Bars3Icon className="w-5 h-5" />
      </button>

      {/* Drawer */}
      {open && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40 md:hidden"
            onClick={() => setOpen(false)}
          />
          <div className="fixed left-0 top-0 bottom-0 w-72 bg-white z-50 shadow-2xl flex flex-col md:hidden">
            {/* Logo + close */}
            <div className="h-16 flex items-center justify-between px-5 border-b border-gray-100">
              <Link href="/sites" onClick={() => setOpen(false)} className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
                  <RocketLaunchIcon className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-gray-900 text-lg">{BRAND_NAME}</span>
              </Link>
              <button onClick={() => setOpen(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto p-3 space-y-4">
              {/* Sites */}
              <div>
                <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Sites</p>
                <div className="space-y-0.5">
                  {sites.map((site) => (
                    <Link
                      key={site.id}
                      href={`/sites/${site.id}`}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors",
                        site.id === activeSiteId
                          ? "bg-brand-50 text-brand-700 font-medium"
                          : "text-gray-600 hover:bg-gray-50"
                      )}
                    >
                      <div className={cn("w-2 h-2 rounded-full flex-shrink-0",
                        site.status === "active" && "bg-emerald-400",
                        site.status === "analyzing" && "bg-amber-400",
                        site.status === "error" && "bg-red-400",
                        site.status === "paused" && "bg-gray-300"
                      )} />
                      <span className="truncate">{site.name || getSiteHostname(site)}</span>
                    </Link>
                  ))}
                  <Link
                    href="/sites/new"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                  >
                    <PlusCircleIcon className="w-4 h-4" />
                    Add site
                  </Link>
                </div>
              </div>

              {/* Site nav */}
              {siteNav.length > 0 && (
                <div>
                  <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    {sites.find((s) => s.id === activeSiteId)?.name || "Site"}
                  </p>
                  <div className="space-y-0.5">
                    {siteNav.map(({ label, href, icon: Icon }) => (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors",
                          pathname === href || (href !== `/sites/${activeSiteId}` && pathname.startsWith(href))
                            ? "bg-brand-50 text-brand-700 font-medium"
                            : "text-gray-600 hover:bg-gray-50"
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        {label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </nav>

            {/* Bottom */}
            <div className="p-3 border-t border-gray-100">
              <Link
                href="/settings"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Cog6ToothIcon className="w-4 h-4" />
                Settings
              </Link>
            </div>
          </div>
        </>
      )}
    </>
  );
}
