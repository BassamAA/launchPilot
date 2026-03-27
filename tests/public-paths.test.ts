import { describe, expect, it } from "vitest";
import { isPublicPath } from "@/lib/public-paths";

describe("isPublicPath", () => {
  it("allows exact public paths but does not over-match prefixes", () => {
    expect(isPublicPath("/")).toBe(true);
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/api/webhooks/resend")).toBe(true);
    expect(isPublicPath("/api/events/track")).toBe(true);
    expect(isPublicPath("/settings")).toBe(false);
    expect(isPublicPath("/loginish")).toBe(false);
  });

  it("allows configured public prefixes and static assets", () => {
    expect(isPublicPath("/auth/callback")).toBe(true);
    expect(isPublicPath("/api/cron/publish-scheduled")).toBe(true);
    expect(isPublicPath("/go/abc123")).toBe(true);
    expect(isPublicPath("/pixel/public-key.js")).toBe(true);
    expect(isPublicPath("/blog/site/post")).toBe(true);
    expect(isPublicPath("/_next/static/chunk.js")).toBe(true);
    expect(isPublicPath("/favicon.ico")).toBe(true);
    expect(isPublicPath("/api/private")).toBe(false);
  });
});
