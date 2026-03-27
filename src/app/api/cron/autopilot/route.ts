import { NextRequest, NextResponse } from "next/server";
import { runAutopilotCycle } from "@/lib/autopilot";
import { logRouteError } from "@/lib/observability";

// Vercel Cron: runs daily at 8am UTC (after generate-scheduled at 6am)
// For every site with autopilot_enabled=true:
//   1. Generates content for ungenerated draft items due today
//   2. Auto-approves and publishes blog + twitter content
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runAutopilotCycle();
    return NextResponse.json({ message: "Autopilot cycle completed", ...result });
  } catch (error) {
    logRouteError("api_autopilot_cron_failed", error);
    return NextResponse.json({ error: "Autopilot cron failed" }, { status: 500 });
  }
}
