import crypto from "crypto";

function getEncryptionKey() {
  const rawKey = process.env.ENCRYPTION_KEY;
  if (!rawKey) {
    throw new Error("ENCRYPTION_KEY is required");
  }

  return crypto.createHash("sha256").update(rawKey).digest();
}

export function encryptSecret(value: string | null | undefined) {
  if (!value) return null;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);

  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

export function decryptSecret(value: string | null | undefined) {
  if (!value) return null;

  const [ivPart, tagPart, encryptedPart] = value.split(":");
  if (!ivPart || !tagPart || !encryptedPart) {
    throw new Error("Invalid encrypted secret");
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivPart, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, "base64url")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
