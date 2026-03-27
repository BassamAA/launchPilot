import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { generateAndSaveContentItem } from "@/lib/generators/content";

// Vercel Cron: runs daily at 6am UTC
// Generates content for items scheduled for today that haven't been generated yet
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: pendingItems } = await supabase
    .from("content_items")
    .select("id")
    .eq("status", "draft")
    .eq("body", "")
    .lte("scheduled_date", today)
    .limit(20);

  if (!pendingItems || pendingItems.length === 0) {
    return NextResponse.json({ message: "No items to generate" });
  }

  let generated = 0;
  let failed = 0;

  for (const item of pendingItems) {
    const result = await generateAndSaveContentItem(item.id, supabase);
    if (result.success) {
      generated++;
    } else {
      failed++;
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  return NextResponse.json({ generated, failed, total: pendingItems.length });
}
