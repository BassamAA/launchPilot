import { ContentItem, Site } from "@/types";

export interface MobileSiteSummary {
  id: string;
  name: string;
  url: string;
  status: string;
  queueCount: number;
  hasPlan: boolean;
  hasBrief: boolean;
  trackingReady: boolean;
  trackingActive: boolean;
  nextAction: {
    type: string;
    label: string;
  };
}

export function computeNextAction(input: {
  site: Pick<Site, "id" | "brief_json" | "brief_confirmed" | "public_tracking_key">;
  hasPlan: boolean;
  queueCount: number;
  approvedCount: number;
  trackingActive: boolean;
}): { type: string; label: string } {
  const { site, hasPlan, queueCount, approvedCount, trackingActive } = input;

  if (!site.brief_confirmed && site.brief_json) return { type: "confirm_brief", label: "Confirm Brief" };
  if (!hasPlan) return { type: "generate_plan", label: "Generate Plan" };
  if (queueCount > 0 || approvedCount > 0) return { type: "open_queue", label: "Open Queue" };
  if (!site.public_tracking_key) return { type: "install_tracking", label: "Install Tracking" };
  if (!trackingActive) return { type: "review_setup", label: "Review Setup" };
  return { type: "view_results", label: "View Results" };
}

export function shapeSiteSummary(input: {
  site: Pick<Site, "id" | "name" | "url" | "status" | "brief_json" | "brief_confirmed" | "public_tracking_key">;
  hasPlan: boolean;
  queueItems: Pick<ContentItem, "status">[];
  trackingActive: boolean;
}): MobileSiteSummary {
  const { site, hasPlan, queueItems, trackingActive } = input;
  const queueCount = queueItems.length;
  const approvedCount = queueItems.filter((item) => item.status === "approved").length;

  return {
    id: site.id,
    name: site.name,
    url: site.url,
    status: site.status,
    queueCount,
    hasPlan,
    hasBrief: Boolean(site.brief_json),
    trackingReady: Boolean(site.public_tracking_key),
    trackingActive,
    nextAction: computeNextAction({
      site,
      hasPlan,
      queueCount,
      approvedCount,
      trackingActive,
    }),
  };
}
