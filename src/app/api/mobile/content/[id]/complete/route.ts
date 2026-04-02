import { NextResponse } from "next/server";
import { getSupabaseServerClient, getUser, getUserFromBearerToken } from "@/lib/supabase";
import { publishContentItem } from "@/lib/publishing";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const user = await getUserFromBearerToken(request.headers.get("authorization")) || await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const supabase = getSupabaseServerClient();

  const result = await publishContentItem(params.id, "manual", supabase);

  if (!result.success) {
    return NextResponse.json({ error: result.error || "Failed to complete content item" }, { status: 400 });
  }

  if (body.publishedUrl) {
    await supabase
      .from("content_items")
      .update({ published_url: body.publishedUrl })
      .eq("id", params.id);
  }

  return NextResponse.json({ ...result, publishedUrl: body.publishedUrl || result.publishedUrl || null });
}
