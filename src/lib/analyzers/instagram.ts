import * as cheerio from "cheerio";
import { InstagramAnalysis } from "@/lib/analyzers/types";

function normalizeHandle(handle: string) {
  return handle.replace(/^@/, "").trim();
}

export async function analyzeInstagram(
  handle: string,
  manualInput?: Record<string, string>
): Promise<InstagramAnalysis> {
  const normalized = normalizeHandle(handle);
  const url = `https://www.instagram.com/${normalized}/`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LaunchPilot/1.0; +https://launchpilot.app)",
        Accept: "text/html",
      },
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) throw new Error(`Could not fetch Instagram profile for @${normalized}`);

    const html = await res.text();
    const $ = cheerio.load(html);
    const title = $("title").text().trim();
    const description =
      $('meta[property="og:description"]').attr("content") ||
      $('meta[name="description"]').attr("content") ||
      "";
    const externalUrl =
      $('meta[property="og:url"]').attr("content") ||
      (description.match(/https?:\/\/\S+/)?.[0] || null);
    const followerMatch = description.match(/([\d.,]+)\s+Followers/i);
    const postMatch = description.match(/([\d.,]+)\s+Posts/i);
    const category = description.split(" - ").slice(-1)[0] || null;

    return {
      source: "instagram",
      handle: normalized,
      displayName: title.replace(/\s*\(@.*$/, "").trim() || normalized,
      bio: description,
      followerCount: followerMatch ? Number(followerMatch[1].replace(/[^\d.]/g, "")) : null,
      postCount: postMatch ? Number(postMatch[1].replace(/[^\d.]/g, "")) : null,
      externalUrl,
      isBusinessAccount: null,
      category,
      manualInput:
        manualInput && Object.keys(manualInput).length > 0
          ? {
              businessType: manualInput.businessType,
              targetAudience: manualInput.targetAudience,
              mainOffering: manualInput.mainOffering,
            }
          : null,
      raw: { title, description },
    };
  } catch {
    return {
      source: "instagram",
      handle: normalized,
      displayName: normalized,
      bio: "",
      followerCount: null,
      postCount: null,
      externalUrl: null,
      isBusinessAccount: null,
      category: null,
      manualInput:
        manualInput && Object.keys(manualInput).length > 0
          ? {
              businessType: manualInput.businessType,
              targetAudience: manualInput.targetAudience,
              mainOffering: manualInput.mainOffering,
            }
          : null,
      raw: {},
    };
  }
}
