import { SiteSourceType } from "@/types";
import { SourceInputs } from "@/lib/analyzers/types";

export function normalizeHandle(value: string) {
  return value.replace(/^@/, "").trim();
}

export function countProvidedPrimarySources(sources: SourceInputs) {
  return [sources.website, sources.twitter, sources.instagram, sources.linkedin].filter(Boolean).length;
}

export function inferSiteSourceType(sources: SourceInputs): SiteSourceType {
  const providedSourceCount = countProvidedPrimarySources(sources);
  if (providedSourceCount > 1) return "multi_source";
  if (sources.website) return "website";
  if (sources.twitter) return "twitter";
  if (sources.instagram) return "instagram";
  return "linkedin";
}
