import crypto from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { verifyResendWebhookSignature } from "@/lib/resend-webhook";

function buildHeaders(body: string, secret: string) {
  const id = "msg_123";
  const timestamp = String(Math.floor(Date.now() / 1000));
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const digest = crypto.createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64");
  return new Headers({
    "svix-id": id,
    "svix-timestamp": timestamp,
    "svix-signature": `v1,${digest}`,
  });
}

describe("verifyResendWebhookSignature", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects requests when the webhook secret is missing", () => {
    vi.unstubAllEnvs();
    const body = JSON.stringify({ type: "email.opened" });
    const headers = new Headers({
      "svix-id": "msg_123",
      "svix-timestamp": String(Math.floor(Date.now() / 1000)),
      "svix-signature": "v1,not-valid",
    });

    expect(verifyResendWebhookSignature(body, headers)).toEqual({
      ok: false,
      reason: "missing_secret",
    });
  });

  it("verifies a valid Svix-style signature", () => {
    const secret = `whsec_${Buffer.from("launchpilot-test-secret").toString("base64")}`;
    vi.stubEnv("RESEND_WEBHOOK_SECRET", secret);
    const body = JSON.stringify({ type: "email.opened" });
    const headers = buildHeaders(body, secret);

    expect(verifyResendWebhookSignature(body, headers).ok).toBe(true);
  });

  it("rejects an invalid signature", () => {
    const secret = `whsec_${Buffer.from("launchpilot-test-secret").toString("base64")}`;
    vi.stubEnv("RESEND_WEBHOOK_SECRET", secret);
    const body = JSON.stringify({ type: "email.opened" });
    const headers = new Headers({
      "svix-id": "msg_123",
      "svix-timestamp": String(Math.floor(Date.now() / 1000)),
      "svix-signature": "v1,not-valid",
    });

    expect(verifyResendWebhookSignature(body, headers).ok).toBe(false);
  });
});
