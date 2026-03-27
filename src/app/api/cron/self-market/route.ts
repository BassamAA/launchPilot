import { NextRequest, NextResponse } from "next/server";
import { logRouteError } from "@/lib/observability";
import { runSelfMarketingCycle } from "@/lib/self-marketing";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runSelfMarketingCycle();
    return NextResponse.json({
      message: "Self-marketing cycle completed",
      ...result,
    });
  } catch (error) {
    logRouteError("api_self_market_cron_failed", error);
    return NextResponse.json({ error: "Self-marketing cron failed" }, { status: 500 });
  }
}
