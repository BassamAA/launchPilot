import { apiGet } from "@/api/client";

export async function fetchLibrary(siteId: string) {
  const data = await apiGet<{ items: any[] }>(`/api/mobile/sites/${siteId}/library`);
  return data.items;
}
