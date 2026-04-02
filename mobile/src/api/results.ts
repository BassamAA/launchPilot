import { apiGet } from "@/api/client";

export async function fetchResults(siteId: string) {
  return apiGet<{ summary: { publishedCount: number; totalConversions: number; channelBreakdown: { channel: string; count: number }[] }; recent: any[] }>(`/api/mobile/sites/${siteId}/results`);
}
