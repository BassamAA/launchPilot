import { apiGet } from "@/api/client";
import { MobileOverview, MobileSiteSummary } from "@/lib/types";

export async function fetchSites(): Promise<MobileSiteSummary[]> {
  const data = await apiGet<{ sites: MobileSiteSummary[] }>("/api/mobile/sites");
  return data.sites;
}

export async function fetchOverview(siteId: string): Promise<MobileOverview> {
  return apiGet<MobileOverview>(`/api/mobile/sites/${siteId}/overview`);
}
