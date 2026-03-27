import {
  InstagramStrategy,
  LinkedInStrategy,
  YouTubeStrategy,
} from "@/lib/generators/instagram";
import { SocialStrategyState } from "@/types";

export type SocialStrategyPlatform = "instagram" | "youtube" | "linkedin";

export const SOCIAL_STRATEGY_PLATFORMS: SocialStrategyPlatform[] = [
  "instagram",
  "youtube",
  "linkedin",
];

type SocialStrategyPayloadMap = {
  instagram: InstagramStrategy;
  youtube: YouTubeStrategy;
  linkedin: LinkedInStrategy;
};

export function normalizeSocialStrategyState(
  value: SocialStrategyState | Record<string, unknown> | null | undefined
): SocialStrategyState {
  if (!value || typeof value !== "object") return {};

  const normalized: SocialStrategyState = {};

  for (const platform of SOCIAL_STRATEGY_PLATFORMS) {
    const entry = (value as Record<string, unknown>)[platform];
    if (
      entry &&
      typeof entry === "object" &&
      "strategy_json" in entry &&
      "generated_at" in entry
    ) {
      if (platform === "instagram") {
        normalized.instagram = entry as SocialStrategyState["instagram"];
      } else if (platform === "youtube") {
        normalized.youtube = entry as SocialStrategyState["youtube"];
      } else {
        normalized.linkedin = entry as SocialStrategyState["linkedin"];
      }
    }
  }

  return normalized;
}

export function hasSocialStrategy(
  value: SocialStrategyState | Record<string, unknown> | null | undefined
) {
  return Object.keys(normalizeSocialStrategyState(value)).length > 0;
}

export function mergeSocialStrategy<TPlatform extends SocialStrategyPlatform>(
  existing: SocialStrategyState | Record<string, unknown> | null | undefined,
  platform: TPlatform,
  strategy: SocialStrategyPayloadMap[TPlatform]
): SocialStrategyState {
  const normalized = normalizeSocialStrategyState(existing);

  return {
    ...normalized,
    [platform]: {
      generated_at: strategy.generated_at || new Date().toISOString(),
      strategy_json: strategy,
    },
  };
}
