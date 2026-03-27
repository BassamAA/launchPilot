import { describe, expect, it } from "vitest";
import { appendAttributionParams, isTrackableDestination } from "@/lib/links";

describe("tracked link helpers", () => {
  it("only tracks destinations on the same site hostname", () => {
    expect(isTrackableDestination("https://www.launchpilot.co/pricing", "https://launchpilot.co")).toBe(true);
    expect(isTrackableDestination("https://docs.launchpilot.co", "https://launchpilot.co")).toBe(false);
    expect(isTrackableDestination("https://evil.com", "https://launchpilot.co")).toBe(false);
  });

  it("appends attribution params and lp_tid", () => {
    const url = appendAttributionParams("https://launchpilot.co/signup", {
      short_code: "abc123",
      utm_source: "launchpilot",
      utm_medium: "twitter",
      utm_campaign: "plan-1",
      utm_content: "content-1",
    });

    expect(url).toContain("utm_source=launchpilot");
    expect(url).toContain("utm_medium=twitter");
    expect(url).toContain("utm_campaign=plan-1");
    expect(url).toContain("utm_content=content-1");
    expect(url).toContain("lp_tid=abc123");
  });
});
