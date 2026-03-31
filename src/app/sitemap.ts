import type { MetadataRoute } from "next";
import { BRAND_MARKETING_URL } from "@/lib/brand";
import { marketingPages } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticPages = ["", "/privacy", "/terms", "/login", "/signup"];

  return [
    ...staticPages.map((path) => ({
      url: `${BRAND_MARKETING_URL}${path || "/"}`,
      lastModified: now,
      changeFrequency: path === "" ? "daily" as const : "monthly" as const,
      priority: path === "" ? 1 : 0.6,
    })),
    ...marketingPages.map((page) => ({
      url: `${BRAND_MARKETING_URL}/${page.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
