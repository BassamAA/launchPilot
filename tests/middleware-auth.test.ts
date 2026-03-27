import { afterEach, describe, expect, it, vi } from "vitest";
import { buildMissingAuthConfigFallback, hasSupabaseAuthEnv } from "@/lib/middleware-auth";

describe("middleware auth helpers", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("detects when Supabase auth env is missing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    expect(hasSupabaseAuthEnv()).toBe(false);
  });

  it("builds a login redirect fallback for protected pages", () => {
    const fallback = buildMissingAuthConfigFallback("/dashboard", "http://127.0.0.1:3000/dashboard");
    expect(fallback.type).toBe("redirect");
    if (fallback.type === "redirect") {
      expect(fallback.location.pathname).toBe("/login");
      expect(fallback.location.searchParams.get("redirect")).toBe("/dashboard");
      expect(fallback.location.searchParams.get("auth_config")).toBe("missing");
    }
  });

  it("builds a 503 JSON fallback for protected APIs", () => {
    const fallback = buildMissingAuthConfigFallback("/api/sites", "http://127.0.0.1:3000/api/sites");
    expect(fallback.type).toBe("json");
    if (fallback.type === "json") {
      expect(fallback.status).toBe(503);
      expect(fallback.body.error).toContain("missing");
    }
  });
});
