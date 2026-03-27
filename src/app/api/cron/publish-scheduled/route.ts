import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { publishContentItem } from "@/lib/publishing";

// Vercel Cron: runs every 15 minutes
// Publishes approved auto_executable Twitter items whose scheduled_date has passed
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();

  const { data: items } = await supabase
    .from("content_items")
    .select("id, channel, auto_executable")
    .eq("status", "approved")
    .lte("scheduled_date", now.split("T")[0])
    .in("channel", ["twitter", "blog"])
    .limit(20);

  if (!items || items.length === 0) {
    return NextResponse.json({ message: "Nothing to publish" });
  }

  let published = 0;
  let failed = 0;
  const details: Array<{ id: string; status: string }> = [];

  for (const item of items) {
    if (item.channel === "twitter" && !item.auto_executable) {
      details.push({ id: item.id, status: "skipped_manual" });
      continue;
    }

    const result = await publishContentItem(item.id, "cron", supabase);
    if (result.success && result.status === "published") {
      published++;
      details.push({ id: item.id, status: "published" });
    } else {
      failed++;
      details.push({ id: item.id, status: result.status });
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  return NextResponse.json({ published, failed, total: items.length, details });
}
