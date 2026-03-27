import crypto from "crypto";
import { NextRequest } from "next/server";

export function getClientIp(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  return req.headers.get("x-real-ip") || "unknown";
}

export function getVisitorHash(ip: string) {
  const salt = process.env.ENCRYPTION_KEY || "launchpilot";
  return crypto.createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export async function parseJsonBody<T>(req: NextRequest) {
  return (await req.json().catch(() => ({}))) as T;
}
