import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase";
import { publishTweetForSite } from "@/lib/publishing";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { site_id, text }: { site_id?: string; text?: string } = await req.json();
    if (!site_id || !text) {
      return NextResponse.json({ error: "site_id and text required" }, { status: 400 });
    }

    const result = await publishTweetForSite(site_id, text);
    if (!result.success) {
      return NextResponse.json({ error: result.error || "Tweet failed" }, { status: 500 });
    }

    const tweetUrl = result.tweetId
      ? `https://twitter.com/i/web/status/${result.tweetId}`
      : null;

    return NextResponse.json({ success: true, tweetUrl });
  } catch (error) {
    console.error("[/api/tweet]", error);
    return NextResponse.json({ error: "Tweet failed" }, { status: 500 });
  }
}
