import { describe, expect, it } from "vitest";
import { checkRateLimit } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  it("allows requests until the limit is reached", () => {
    const key = `test:${Date.now()}`;
    expect(checkRateLimit(key, 2, 1000).allowed).toBe(true);
    expect(checkRateLimit(key, 2, 1000).allowed).toBe(true);
    expect(checkRateLimit(key, 2, 1000).allowed).toBe(false);
  });
});
