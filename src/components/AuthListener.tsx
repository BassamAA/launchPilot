"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

/**
 * Listens to Supabase auth state changes and keeps the server session
 * in sync. Handles sign-out redirects and token refreshes.
 */
export function AuthListener() {
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        router.push("/login");
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return null;
}
