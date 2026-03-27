import { describe, expect, it } from "vitest";
import { mapSitePatchError } from "@/lib/site-updates";

describe("mapSitePatchError", () => {
  it("maps missing onboarding columns to a migration guidance response", () => {
    const mapped = mapSitePatchError(new Error('column "onboarding_json" of relation "sites" does not exist'));
    expect(mapped.status).toBe(409);
    expect(mapped.error).toContain("db push");
  });

  it("falls back to a generic update failure for unrelated errors", () => {
    const mapped = mapSitePatchError(new Error("permission denied"));
    expect(mapped.status).toBe(500);
    expect(mapped.error).toBe("Update failed");
  });
});
