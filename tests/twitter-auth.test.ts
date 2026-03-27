import { afterEach, describe, expect, it } from "vitest";
import { getTwitterConnectionErrorMessage, hasTwitterOAuthEnv } from "@/lib/twitter-auth";

describe("twitter auth helpers", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("detects missing oauth env", () => {
    delete process.env.TWITTER_CLIENT_ID;
    delete process.env.TWITTER_CLIENT_SECRET;
    delete process.env.TWITTER_CALLBACK_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;

    expect(hasTwitterOAuthEnv()).toBe(false);
  });

  it("accepts configured oauth env with app url fallback", () => {
    process.env.TWITTER_CLIENT_ID = "client";
    process.env.TWITTER_CLIENT_SECRET = "secret";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

    expect(hasTwitterOAuthEnv()).toBe(true);
  });

  it("maps setup errors to a human-readable message", () => {
    expect(getTwitterConnectionErrorMessage("twitter_not_configured")).toContain("TWITTER_CLIENT_ID");
    expect(getTwitterConnectionErrorMessage("twitter_token")).toContain("token exchange failed");
  });
});
