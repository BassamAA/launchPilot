import { BRAND_NAME } from "@/lib/brand";

export function hasLinkedInOAuthEnv() {
  return Boolean(
    process.env.LINKEDIN_CLIENT_ID &&
      process.env.LINKEDIN_CLIENT_SECRET &&
      process.env.NEXT_PUBLIC_APP_URL
  );
}

export function getLinkedInConnectionErrorMessage(error?: string | null) {
  switch (error) {
    case "linkedin_not_configured":
      return "LinkedIn OAuth is not configured. Set LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, and NEXT_PUBLIC_APP_URL.";
    case "linkedin_denied":
      return "LinkedIn authorization was denied.";
    case "linkedin_invalid_state":
      return "LinkedIn authorization expired or became invalid. Try connecting again.";
    case "linkedin_invalid_site":
      return `${BRAND_NAME} could not match that LinkedIn callback to a site.`;
    case "linkedin_token":
      return "LinkedIn token exchange failed. Verify your callback URL, requested products, and app permissions, then try again.";
    case "linkedin_profile":
      return "LinkedIn connected, but we could not load the profile details needed to post.";
    case "linkedin_save_failed":
      return "LinkedIn authenticated but failed to save the connection. Check Vercel logs for details.";
    default:
      return error ? `LinkedIn error: ${error}` : null;
  }
}
