import { MobileQueueItem } from "@/lib/types";

export function getPlatformSections(item: MobileQueueItem) {
  const sections: Array<{ title: string; body: string }> = [];
  const body = item.body || item.title || "";

  if (item.channel === "instagram") {
    sections.push({ title: "Caption", body });
  } else if (item.channel === "tiktok") {
    sections.push({ title: "Script / Caption", body });
  } else if (item.channel === "reddit") {
    sections.push({ title: "Post", body });
  } else {
    sections.push({ title: "Content", body });
  }

  for (const [key, value] of Object.entries(item.context)) {
    if (!value) continue;
    sections.push({ title: key, body: value });
  }

  return sections;
}

export function getPlatformHint(item: MobileQueueItem) {
  switch (item.channel) {
    case "reddit":
      return "Open the target thread or subreddit, paste your response, then mark it posted here.";
    case "instagram":
      return "Copy the caption, switch to Instagram, publish, then paste the final URL if you have it.";
    case "tiktok":
      return "Use this as your script/caption, post in TikTok, then return and mark complete.";
    case "facebook":
      return "Copy the post text, open Facebook, publish, then return here.";
    case "linkedin":
      return "Open LinkedIn, paste the post, publish, then mark complete.";
    case "twitter":
    case "tweet":
      return "Use the post on X shortcut, then return here to confirm it went out.";
    default:
      return "Copy, open platform, post, then mark complete.";
  }
}
