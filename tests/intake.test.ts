import { describe, expect, it } from "vitest";
import { countProvidedPrimarySources, inferSiteSourceType, normalizeHandle } from "@/lib/intake";

describe("intake helpers", () => {
  it("normalizes handles and counts only primary sources", () => {
    expect(normalizeHandle("@launchpilot")).toBe("launchpilot");
    expect(countProvidedPrimarySources({
      twitter: "@launchpilot",
      instagram: "@lp",
      instagram_manual: { businessType: "saas" },
    })).toBe(2);
  });

  it("classifies multi-source sites correctly even without a website", () => {
    expect(inferSiteSourceType({ twitter: "@launchpilot", instagram: "@lp" })).toBe("multi_source");
    expect(inferSiteSourceType({ website: "https://launchpilot.co" })).toBe("website");
    expect(inferSiteSourceType({ linkedin: "linkedin.com/company/launchpilot" })).toBe("linkedin");
  });
});
