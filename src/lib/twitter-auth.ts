import { BRAND_NAME } from "@/lib/brand";

export function hasTwitterOAuthEnv() {
  return Boolean(
    process.env.TWITTER_CLIENT_ID &&
      process.env.TWITTER_CLIENT_SECRET &&
      (process.env.TWITTER_CALLBACK_URL || process.env.NEXT_PUBLIC_APP_URL)
  );
}

export function getTwitterConnectionErrorMessage(error?: string | null) {
  switch (error) {
    case "twitter_not_configured":
      return "Twitter OAuth is not configured. Set TWITTER_CLIENT_ID, TWITTER_CLIENT_SECRET, and NEXT_PUBLIC_APP_URL or TWITTER_CALLBACK_URL.";
    case "twitter_denied":
      return "Twitter authorization was denied.";
    case "twitter_invalid_state":
      return "Twitter authorization expired or became invalid. Try connecting again.";
    case "twitter_invalid_site":
      return `${BRAND_NAME} could not match that Twitter callback to a site.`;
    case "twitter_token":
      return "Twitter token exchange failed. Verify your callback URL and app permissions, then try again.";
    default:
      return error ? `Twitter error: ${error}` : null;
  }
}
