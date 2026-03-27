import { NextRequest, NextResponse } from "next/server";
import { logStructured } from "@/lib/observability";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { z } from "zod";

const errorSchema = z.object({
  source: z.string().trim().min(1),
  message: z.string().trim().min(1),
  stack: z.string().trim().optional(),
  digest: z.string().trim().optional(),
  pathname: z.string().trim().optional(),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const limited = checkRateLimit(`monitor:${ip}`, 20, 60_000);
  if (!limited.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const parsed = errorSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  logStructured("error", "client_runtime_error", {
    ...parsed.data,
    ip,
  });

  return NextResponse.json({ ok: true });
}
