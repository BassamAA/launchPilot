import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { publishContentItem } from "@/lib/publishing";

// Vercel Cron: runs daily at 9am UTC
// Publishes approved auto-executable items that do not require a future schedule.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: readyItems } = await supabase
    .from("content_items")
    .select("id, channel")
    .eq("status", "approved")
    .eq("auto_executable", true)
    .in("channel", ["twitter", "blog"])
    .or(`scheduled_date.is.null,scheduled_date.lte.${today}`)
    .limit(50);

  if (!readyItems || readyItems.length === 0) {
    return NextResponse.json({ message: "No items to publish" });
  }

  let published = 0;
  let failed = 0;

  for (const item of readyItems) {
    const result = await publishContentItem(item.id, "cron", supabase);
    if (result.success && result.status === "published") {
      published++;
    } else {
      failed++;
    }
  }

  return NextResponse.json({ published, failed, total: readyItems.length });
}
