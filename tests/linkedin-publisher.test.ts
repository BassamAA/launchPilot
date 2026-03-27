import { afterEach, describe, expect, it, vi } from "vitest";
import { publishToLinkedIn } from "@/lib/publishers/linkedin";

describe("linkedin publisher", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("posts text to the ugc api and returns the post id", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "urn:li:ugcPost:123" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await publishToLinkedIn("Hello LinkedIn", "token-123", "urn:li:person:abc");

    expect(result).toEqual({ postId: "urn:li:ugcPost:123" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.linkedin.com/v2/ugcPosts",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
          "X-Restli-Protocol-Version": "2.0.0",
        }),
      })
    );
  });

  it("throws on non-2xx responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => "bad request",
    }));

    await expect(
      publishToLinkedIn("Hello LinkedIn", "token-123", "urn:li:person:abc")
    ).rejects.toThrow("bad request");
  });
});
