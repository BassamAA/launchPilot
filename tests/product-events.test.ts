import { describe, expect, it } from "vitest";
import { PRODUCT_EVENT_WEIGHTS } from "@/lib/product-events";

describe("PRODUCT_EVENT_WEIGHTS", () => {
  it("weights downstream outcomes above signups", () => {
    expect(PRODUCT_EVENT_WEIGHTS.subscribed).toBeGreaterThan(PRODUCT_EVENT_WEIGHTS.activated);
    expect(PRODUCT_EVENT_WEIGHTS.activated).toBeGreaterThan(PRODUCT_EVENT_WEIGHTS.signup);
  });
});
