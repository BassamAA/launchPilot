import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { refreshTwitterConnectionToken } from "@/lib/publishing";

// Vercel Cron: runs every 6 hours
// Proactively refreshes Twitter tokens expiring within the next 2 hours
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

  const { data: connections } = await supabase
    .from("platform_connections")
    .select("*")
    .eq("platform", "twitter")
    .not("refresh_token", "is", null)
    .lte("token_expires_at", twoHoursFromNow);

  if (!connections || connections.length === 0) {
    return NextResponse.json({ message: "No tokens to refresh" });
  }

  let refreshed = 0;
  let failed = 0;

  for (const conn of connections) {
    const refreshedToken = await refreshTwitterConnectionToken(conn, supabase);
    if (refreshedToken) {
      refreshed++;
    } else {
      failed++;
    }
  }

  return NextResponse.json({ refreshed, failed, total: connections.length });
}
