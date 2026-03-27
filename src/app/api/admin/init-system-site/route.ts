import { NextRequest, NextResponse } from "next/server";
import { ensureSelfMarketingSite } from "@/lib/self-marketing";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { site } = await ensureSelfMarketingSite();
  return NextResponse.json({ ok: true, siteId: site.id, siteName: site.name });
}
