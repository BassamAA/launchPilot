import { analyzeInstagram } from "@/lib/analyzers/instagram";
import { analyzeLinkedIn } from "@/lib/analyzers/linkedin";
import {
  SourceInputs,
  MergedAnalysis,
  WebsiteAnalysis,
  TwitterAnalysis,
  InstagramAnalysis,
  LinkedInAnalysis,
} from "@/lib/analyzers/types";
import { analyzeTwitter } from "@/lib/analyzers/twitter";
import { analyzeWebsite } from "@/lib/analyzers/website";
import { logStructured } from "@/lib/observability";

function scoreSource(value: object | undefined | null) {
  if (!value) return 0;
  return Object.values(value).reduce<number>((score, entry) => {
    if (entry === null || entry === undefined) return score;
    if (Array.isArray(entry)) return score + entry.length;
    if (typeof entry === "string") return score + (entry.length > 0 ? 1 : 0);
    if (typeof entry === "number") return score + (entry > 0 ? 1 : 0);
    if (typeof entry === "object") return score + Object.keys(entry as object).length;
    return score;
  }, 0);
}

type AnalyzedSources = {
  website?: WebsiteAnalysis;
  twitter?: TwitterAnalysis;
  instagram?: InstagramAnalysis;
  linkedin?: LinkedInAnalysis;
};

function hasWebsiteData(website: WebsiteAnalysis | null | undefined) {
  if (!website) return false;
  return Boolean(
    website.title ||
      website.description ||
      website.bodyText ||
      website.features.length ||
      website.headings.length
  );
}

function hasTwitterData(twitter: TwitterAnalysis | null | undefined) {
  if (!twitter) return false;
  return Boolean(
    twitter.bio ||
      twitter.recentTweets.length ||
      twitter.topTweets.length ||
      twitter.followerCount > 0 ||
      (twitter.displayName && twitter.displayName !== twitter.handle)
  );
}

function hasInstagramData(instagram: InstagramAnalysis | null | undefined) {
  if (!instagram) return false;
  return Boolean(
    instagram.bio ||
      instagram.followerCount ||
      instagram.postCount ||
      instagram.externalUrl ||
      (instagram.manualInput && Object.values(instagram.manualInput).some(Boolean))
  );
}

function hasLinkedInData(linkedin: LinkedInAnalysis | null | undefined) {
  if (!linkedin) return false;
  return Boolean(
    linkedin.description ||
      linkedin.headline ||
      linkedin.industry ||
      linkedin.websiteUrl ||
      linkedin.followerCount ||
      (linkedin.manualInput && Object.values(linkedin.manualInput).some(Boolean))
  );
}

export function mergeAnalyzedSources(sources: AnalyzedSources): MergedAnalysis {
  const website = hasWebsiteData(sources.website) ? sources.website : undefined;
  const twitter = hasTwitterData(sources.twitter) ? sources.twitter : undefined;
  const instagram = hasInstagramData(sources.instagram) ? sources.instagram : undefined;
  const linkedin = hasLinkedInData(sources.linkedin) ? sources.linkedin : undefined;

  const sourceScores = [
    ["website", scoreSource(website || undefined)],
    ["twitter", scoreSource(twitter || undefined)],
    ["instagram", scoreSource(instagram || undefined)],
    ["linkedin", scoreSource(linkedin || undefined)],
  ] as const;

  const primarySource = [...sourceScores].sort((a, b) => b[1] - a[1])[0]?.[0] || "website";

  const followerCounts: Record<string, number> = {};
  if (twitter?.followerCount) followerCounts.twitter = twitter.followerCount;
  if (instagram?.followerCount) followerCounts.instagram = instagram.followerCount;
  if (linkedin?.followerCount) followerCounts.linkedin = linkedin.followerCount;

  const existingChannels = [
    website ? "website" : null,
    twitter ? "twitter" : null,
    instagram ? "instagram" : null,
    linkedin ? "linkedin" : null,
  ].filter(Boolean) as string[];

  const offerings = [
    ...(website?.features || []),
    ...(instagram?.manualInput?.mainOffering ? [instagram.manualInput.mainOffering] : []),
    ...(linkedin?.manualInput?.aboutText ? [linkedin.manualInput.aboutText] : []),
  ]
    .filter(Boolean)
    .slice(0, 8);

  const socialProof = [
    ...(website?.testimonials || []),
    ...(twitter?.followerCount ? [`${twitter.followerCount} Twitter followers`] : []),
    ...(instagram?.followerCount ? [`${instagram.followerCount} Instagram followers`] : []),
    ...(linkedin?.followerCount ? [`${linkedin.followerCount} LinkedIn followers`] : []),
  ].slice(0, 8);

  return {
    sources: {
      ...(website ? { website } : {}),
      ...(twitter ? { twitter } : {}),
      ...(instagram ? { instagram } : {}),
      ...(linkedin ? { linkedin } : {}),
    },
    sourceCount: existingChannels.length,
    primarySource,
    merged: {
      businessName:
        website?.title ||
        twitter?.displayName ||
        instagram?.displayName ||
        linkedin?.name ||
        "Unknown business",
      description:
        website?.description ||
        twitter?.bio ||
        instagram?.bio ||
        linkedin?.description ||
        "",
      offerings,
      targetAudience:
        instagram?.manualInput?.targetAudience ||
        linkedin?.manualInput?.aboutText ||
        website?.bodyText.slice(0, 240) ||
        twitter?.bio ||
        "",
      existingChannels,
      followerCounts,
      contentVoice: twitter?.voiceTone || "professional",
      websiteUrl: website?.url || twitter?.websiteFromBio || instagram?.externalUrl || linkedin?.websiteUrl || null,
      pricing: website?.pricing || null,
      socialProof,
    },
  };
}

export async function analyzeAllSources(
  sources: SourceInputs,
  options?: { siteId?: string }
): Promise<MergedAnalysis> {
  const settled = await Promise.allSettled([
    sources.website ? analyzeWebsite(sources.website) : Promise.resolve(null),
    sources.twitter ? analyzeTwitter(sources.twitter, options?.siteId) : Promise.resolve(null),
    sources.instagram ? analyzeInstagram(sources.instagram, sources.instagram_manual) : Promise.resolve(null),
    sources.linkedin ? analyzeLinkedIn(sources.linkedin, sources.linkedin_manual) : Promise.resolve(null),
  ]);

  settled.forEach((result, index) => {
    if (result.status === "rejected") {
      const source = ["website", "twitter", "instagram", "linkedin"][index];
      logStructured("warn", "source_analysis_failed", {
        site_id: options?.siteId || null,
        source,
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      });
    }
  });

  return mergeAnalyzedSources({
    website: settled[0].status === "fulfilled" ? settled[0].value || undefined : undefined,
    twitter: settled[1].status === "fulfilled" ? settled[1].value || undefined : undefined,
    instagram: settled[2].status === "fulfilled" ? settled[2].value || undefined : undefined,
    linkedin: settled[3].status === "fulfilled" ? settled[3].value || undefined : undefined,
  });
}
