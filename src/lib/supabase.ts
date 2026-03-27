// Server-only Supabase utilities
// Do NOT import this in Client Components — use supabase-browser.ts instead

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// ─── Server client (for Server Components / API Routes) ─────────────
export function getSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Server Component — ignore
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Server Component — ignore
          }
        },
      },
    }
  );
}

// ─── Admin client (service role, for server-only operations) ─────────
export function getSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

// ─── Auth helpers ────────────────────────────────────────────────────
export async function getUser() {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function getUserProfile() {
  const user = await getUser();
  if (!user) return null;

  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return data;
}

export async function getCurrentUserCompanyId() {
  const profile = await getUserProfile();
  return profile?.company_id ?? null;
}

export async function getAuthorizedSite(siteId: string) {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("sites")
    .select("id, company_id")
    .eq("id", siteId)
    .single();

  return data ?? null;
}

export async function getAuthorizedPlan(planId: string) {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("marketing_plans")
    .select("id, site_id, status")
    .eq("id", planId)
    .single();

  return data ?? null;
}

export async function getAuthorizedContentItem(contentItemId: string) {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("content_items")
    .select("id, site_id, plan_id, status, channel, title")
    .eq("id", contentItemId)
    .single();

  return data ?? null;
}
