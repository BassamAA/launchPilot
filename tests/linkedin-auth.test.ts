import { afterEach, describe, expect, it } from "vitest";
import {
  getLinkedInConnectionErrorMessage,
  hasLinkedInOAuthEnv,
} from "@/lib/linkedin-auth";

describe("linkedin auth helpers", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("detects missing oauth env", () => {
    delete process.env.LINKEDIN_CLIENT_ID;
    delete process.env.LINKEDIN_CLIENT_SECRET;
    delete process.env.NEXT_PUBLIC_APP_URL;

    expect(hasLinkedInOAuthEnv()).toBe(false);
  });

  it("accepts configured oauth env", () => {
    process.env.LINKEDIN_CLIENT_ID = "client";
    process.env.LINKEDIN_CLIENT_SECRET = "secret";
    process.env.NEXT_PUBLIC_APP_URL = "https://breakthroughpilot.com";

    expect(hasLinkedInOAuthEnv()).toBe(true);
  });

  it("maps setup errors to human-readable messages", () => {
    expect(getLinkedInConnectionErrorMessage("linkedin_not_configured")).toContain("LINKEDIN_CLIENT_ID");
    expect(getLinkedInConnectionErrorMessage("linkedin_profile")).toContain("profile details");
  });
});
