import { apiGet, apiPost } from "@/api/client";
import { MobileQueueItem } from "@/lib/types";

export async function fetchQueue(siteId: string): Promise<MobileQueueItem[]> {
  const data = await apiGet<{ items: MobileQueueItem[] }>(`/api/mobile/sites/${siteId}/queue`);
  return data.items;
}

export async function completeQueueItem(itemId: string, publishedUrl?: string) {
  return apiPost(`/api/mobile/content/${itemId}/complete`, { publishedUrl });
}
