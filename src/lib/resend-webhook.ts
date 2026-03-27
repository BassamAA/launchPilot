import crypto from "crypto";

function secureCompare(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function parseSignatureHeader(header: string | null) {
  if (!header) return [];
  return header
    .split(/\s+/)
    .flatMap((part) => part.split(" "))
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [version, signature] = part.split(",");
      return { version, signature };
    })
    .filter((entry) => entry.version && entry.signature);
}

export function verifyResendWebhookSignature(body: string, headers: Headers) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return { ok: process.env.NODE_ENV !== "production", reason: "missing_secret" as const };
  }

  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const signatures = parseSignatureHeader(headers.get("svix-signature"));

  if (!id || !timestamp || signatures.length === 0) {
    return { ok: false, reason: "missing_headers" as const };
  }

  const timestampMs = Number(timestamp) * 1000;
  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > 5 * 60 * 1000) {
    return { ok: false, reason: "timestamp_out_of_range" as const };
  }

  const normalizedSecret = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  const key = Buffer.from(normalizedSecret, "base64");
  const payload = `${id}.${timestamp}.${body}`;
  const digest = crypto.createHmac("sha256", key).update(payload).digest("base64");

  const matched = signatures.some(
    ({ version, signature }) => version === "v1" && secureCompare(signature, digest)
  );

  return matched ? { ok: true, reason: "verified" as const } : { ok: false, reason: "invalid_signature" as const };
}
