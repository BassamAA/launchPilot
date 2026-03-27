import { NextRequest, NextResponse } from "next/server";
import { getAuthorizedSite, getUser, getSupabaseAdminClient } from "@/lib/supabase";
import { encryptSecret } from "@/lib/crypto";

// GET /api/connections?site_id=xxx — list platform connections for a site
export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get("site_id");
  if (!siteId) return NextResponse.json({ error: "site_id required" }, { status: 400 });

  const site = await getAuthorizedSite(siteId);
  if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("platform_connections")
    .select("id, platform, platform_username, platform_user_id, metadata_json, connected_at, expires_at")
    .eq("site_id", site.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ connections: data || [] });
}

// POST /api/connections — upsert a site connection or integration settings
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    site_id,
    platform,
    metadata_json,
    access_token,
    refresh_token,
    platform_user_id,
    platform_username,
    expires_at,
  } = await req.json();

  if (!site_id || !platform) {
    return NextResponse.json({ error: "site_id and platform required" }, { status: 400 });
  }

  const site = await getAuthorizedSite(site_id);
  if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("platform_connections")
    .upsert(
      {
        site_id: site.id,
        platform,
        access_token_encrypted: encryptSecret(access_token || null),
        refresh_token_encrypted: encryptSecret(refresh_token || null),
        platform_user_id: platform_user_id || null,
        platform_username: platform_username || null,
        metadata_json: metadata_json || {},
        connected_at: new Date().toISOString(),
        expires_at: expires_at || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "site_id,platform" }
    )
    .select("id, platform, platform_username, platform_user_id, metadata_json, connected_at, expires_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ connection: data });
}

// DELETE /api/connections — disconnect a platform
export async function DELETE(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { site_id, platform } = await req.json();
  if (!site_id || !platform) {
    return NextResponse.json({ error: "site_id and platform required" }, { status: 400 });
  }

  const site = await getAuthorizedSite(site_id);
  if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("platform_connections")
    .delete()
    .eq("site_id", site.id)
    .eq("platform", platform);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
