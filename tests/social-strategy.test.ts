import { describe, expect, it } from "vitest";
import {
  hasSocialStrategy,
  mergeSocialStrategy,
  normalizeSocialStrategyState,
} from "@/lib/social-strategy";

describe("social strategy helpers", () => {
  it("normalizes unexpected values into an empty state", () => {
    expect(normalizeSocialStrategyState(null)).toEqual({});
    expect(normalizeSocialStrategyState({ foo: "bar" })).toEqual({});
  });

  it("merges a new platform without overwriting existing platforms", () => {
    const merged = mergeSocialStrategy(
      {
        instagram: {
          generated_at: "2026-03-27T00:00:00.000Z",
          strategy_json: { generated_at: "2026-03-27T00:00:00.000Z" } as never,
        },
      },
      "youtube",
      {
        channel_positioning: "Positioning",
        content_series: [],
        video_ideas: [],
        seo_keywords: [],
        collaborators: [],
        channel_growth_tactics: [],
        what_not_to_do: [],
        generated_at: "2026-03-28T00:00:00.000Z",
      }
    );

    expect(merged.instagram).toBeDefined();
    expect(merged.youtube?.generated_at).toBe("2026-03-28T00:00:00.000Z");
    expect(hasSocialStrategy(merged)).toBe(true);
  });
});
