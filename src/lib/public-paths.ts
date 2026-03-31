const PUBLIC_EXACT_PATHS = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/privacy",
  "/terms",
  "/robots.txt",
  "/sitemap.xml",
  "/api/stripe/webhook",
  "/api/webhooks/resend",
  "/api/track",
  "/api/conversions/track",
  "/api/events/track",
  "/api/monitor/error",
  "/api/health",
];

const PUBLIC_PREFIXES = [
  "/auth",
  "/api/cron",
  "/go",
  "/pixel",
  "/blog",
  "/ai-marketing-for-indie-hackers",
  "/startup-marketing-without-hiring-a-team",
  "/chatgpt-for-marketing-vs-breakthroughpilot",
];

export function isPublicPath(pathname: string) {
  return (
    PUBLIC_EXACT_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  );
}

export const PUBLIC_PATH_RULES = {
  exact: PUBLIC_EXACT_PATHS,
  prefixes: PUBLIC_PREFIXES,
};
