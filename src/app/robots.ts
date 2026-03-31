import type { MetadataRoute } from "next";
import { BRAND_DOMAIN, BRAND_MARKETING_URL } from "@/lib/brand";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dashboard", "/sites", "/settings", "/admin"],
    },
    sitemap: `${BRAND_MARKETING_URL}/sitemap.xml`,
    host: BRAND_DOMAIN,
  };
}
