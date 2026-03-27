import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "@/lib/crypto";

describe("crypto helpers", () => {
  const originalKey = process.env.ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = "test-encryption-key";
  });

  afterEach(() => {
    process.env.ENCRYPTION_KEY = originalKey;
  });

  it("round-trips encrypted secrets", () => {
    const encrypted = encryptSecret("top-secret-token");
    expect(encrypted).toBeTruthy();
    expect(encrypted).not.toContain("top-secret-token");
    expect(decryptSecret(encrypted)).toBe("top-secret-token");
  });

  it("rejects malformed encrypted secrets", () => {
    expect(() => decryptSecret("bad-value")).toThrow("Invalid encrypted secret");
  });
});
