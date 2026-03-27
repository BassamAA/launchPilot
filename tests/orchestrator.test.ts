import { describe, expect, it } from "vitest";
import { mergeAnalyzedSources } from "@/lib/analyzers/orchestrator";

describe("mergeAnalyzedSources", () => {
  it("ignores empty fallback social sources", () => {
    const merged = mergeAnalyzedSources({
      instagram: {
        source: "instagram",
        handle: "emptyprofile",
        displayName: "emptyprofile",
        bio: "",
        followerCount: null,
        postCount: null,
        externalUrl: null,
        isBusinessAccount: null,
        category: null,
        manualInput: null,
        raw: {},
      },
    });

    expect(merged.sourceCount).toBe(0);
    expect(merged.sources.instagram).toBeUndefined();
  });

  it("keeps manual-only enrichment as a valid source", () => {
    const merged = mergeAnalyzedSources({
      instagram: {
        source: "instagram",
        handle: "launchpilot",
        displayName: "launchpilot",
        bio: "",
        followerCount: null,
        postCount: null,
        externalUrl: null,
        isBusinessAccount: null,
        category: null,
        manualInput: {
          businessType: "saas",
          targetAudience: "bootstrapped founders",
          mainOffering: "autonomous growth engine",
        },
        raw: {},
      },
    });

    expect(merged.sourceCount).toBe(1);
    expect(merged.sources.instagram?.manualInput?.mainOffering).toBe("autonomous growth engine");
    expect(merged.merged.targetAudience).toBe("bootstrapped founders");
  });
});
