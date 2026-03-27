import * as cheerio from "cheerio";
import { LinkedInAnalysis } from "@/lib/analyzers/types";

export async function analyzeLinkedIn(
  url: string,
  manualInput?: Record<string, string>
): Promise<LinkedInAnalysis> {
  const normalized = url.startsWith("http") ? url : `https://${url}`;
  const profileType: "personal" | "company" = normalized.includes("/company/") ? "company" : "personal";

  try {
    const res = await fetch(normalized, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LaunchPilot/1.0; +https://launchpilot.app)",
        Accept: "text/html",
      },
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) throw new Error("Could not fetch LinkedIn profile");

    const html = await res.text();
    const $ = cheerio.load(html);
    const title = $("title").text().trim();
    const description =
      $('meta[property="og:description"]').attr("content") ||
      $('meta[name="description"]').attr("content") ||
      "";
    const followerMatch = description.match(/([\d.,]+)\s+followers?/i);

    return {
      source: "linkedin",
      profileType,
      name: $('meta[property="og:title"]').attr("content") || title || normalized,
      headline: manualInput?.headline || title,
      description: manualInput?.aboutText || description,
      industry: manualInput?.industry || null,
      followerCount: followerMatch ? Number(followerMatch[1].replace(/[^\d.]/g, "")) : null,
      websiteUrl: description.match(/https?:\/\/\S+/)?.[0] || null,
      manualInput:
        manualInput && Object.keys(manualInput).length > 0
          ? {
              aboutText: manualInput.aboutText,
              headline: manualInput.headline,
              industry: manualInput.industry,
            }
          : null,
      raw: { title, description },
    };
  } catch {
    return {
      source: "linkedin",
      profileType,
      name: normalized,
      headline: manualInput?.headline || "",
      description: manualInput?.aboutText || "",
      industry: manualInput?.industry || null,
      followerCount: null,
      websiteUrl: null,
      manualInput:
        manualInput && Object.keys(manualInput).length > 0
          ? {
              aboutText: manualInput.aboutText,
              headline: manualInput.headline,
              industry: manualInput.industry,
            }
          : null,
      raw: {},
    };
  }
}
