export function hasSupabaseAuthEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function buildMissingAuthConfigFallback(pathname: string, requestUrl: string) {
  if (pathname.startsWith("/api/")) {
    return {
      type: "json" as const,
      status: 503,
      body: { error: "Auth configuration missing" },
    };
  }

  const loginUrl = new URL("/login", requestUrl);
  loginUrl.searchParams.set("redirect", pathname);
  loginUrl.searchParams.set("auth_config", "missing");

  return {
    type: "redirect" as const,
    status: 307,
    location: loginUrl,
  };
}
