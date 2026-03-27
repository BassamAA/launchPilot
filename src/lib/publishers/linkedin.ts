import { logStructured } from "@/lib/observability";

export async function publishToLinkedIn(
  text: string,
  accessToken: string,
  personUrn: string
): Promise<{ postId: string }> {
  const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "X-Restli-Protocol-Version": "2.0.0",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      author: personUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text },
          shareMediaCategory: "NONE",
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    logStructured("error", "linkedin_publish_failed", {
      status: response.status,
      body,
      person_urn: personUrn,
    });
    throw new Error(body || "LinkedIn publish failed");
  }

  const data = (await response.json()) as { id?: string };
  if (!data.id) {
    throw new Error("LinkedIn publish succeeded without a post ID");
  }

  return { postId: data.id };
}
