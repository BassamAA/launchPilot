import { callClaude, buildMarketingSystemPrompt } from "@/lib/claude";
import { MarketingBrief } from "@/types";

export interface DirectoryListing {
  directory_name: string;
  directory_url: string;
  submission_url: string;
  category: string;
  tagline: string;
  short_description: string;
  long_description: string;
  tags: string[];
  notes: string;
}

interface DirectoryBatch {
  listings: DirectoryListing[];
}

// Known directories with submission URLs
const DIRECTORIES = [
  { name: "Product Hunt", url: "https://www.producthunt.com", submit: "https://www.producthunt.com/posts/new" },
  { name: "Indie Hackers", url: "https://www.indiehackers.com", submit: "https://www.indiehackers.com/products/new" },
  { name: "BetaList", url: "https://betalist.com", submit: "https://betalist.com/submit" },
  { name: "AlternativeTo", url: "https://alternativeto.net", submit: "https://alternativeto.net/add-app" },
  { name: "SaaSHub", url: "https://www.saashub.com", submit: "https://www.saashub.com/submit" },
  { name: "Hacker News (Show HN)", url: "https://news.ycombinator.com", submit: "https://news.ycombinator.com/submit" },
  { name: "There's An AI For That", url: "https://theresanaiforthat.com", submit: "https://theresanaiforthat.com/submit-ai-tool/" },
  { name: "Launching Next", url: "https://www.launchingnext.com", submit: "https://www.launchingnext.com/submit/" },
  { name: "SideProjectors", url: "https://www.sideprojectors.com", submit: "https://www.sideprojectors.com" },
  { name: "Uneed", url: "https://www.uneed.best", submit: "https://www.uneed.best/submit" },
];

export async function generateDirectoryListings(
  brief: MarketingBrief,
  siteUrl: string,
  guidance?: string
): Promise<DirectoryListing[]> {
  const systemPrompt = buildMarketingSystemPrompt(brief);

  const directoriesStr = DIRECTORIES.map((d) => `${d.name} (${d.url})`).join(", ");

  const userPrompt = `Write directory submission copy for ${brief.product_name} (${siteUrl}).
${guidance ? `\nContent intelligence:\n${guidance}\n` : ""}

Directories: ${directoriesStr}

For each directory generate:
- tagline: Under 60 characters. Lead with what it does, not what it "is". "Your startup's marketing team on autopilot" not "An AI marketing platform for founders."
- short_description: 100–150 characters. The one outcome a potential user gets.
- long_description: 250–400 characters. Outcome first, then how, then who it's for. End with one concrete detail (price, use case, or specific result).
- tags: 5–8 real categories that exist on that platform

Rules:
- Every description should be different — tagline, short, and long for each platform
- Lead with the outcome or the customer's problem, not features
- Use plain words — not "leverage", "seamlessly", "comprehensive", "robust", "powerful"
- The Show HN post must follow HN format exactly: "Show HN: [What it actually does] – [one-line description]" — factual, no marketing spin
- Tags should be real, searchable categories on each platform

Return JSON:
{
  "listings": [
    {
      "directory_name": "Product Hunt",
      "directory_url": "https://producthunt.com",
      "submission_url": "https://www.producthunt.com/posts/new",
      "category": "productivity",
      "tagline": "Under 60 chars",
      "short_description": "Under 150 chars",
      "long_description": "250-400 chars",
      "tags": ["tag1", "tag2"],
      "notes": "Specific tip for this directory (e.g. best day to launch on PH, HN etiquette)"
    }
  ]
}`;

  const result = await callClaude<DirectoryBatch>({
    model: "sonnet",
    systemPrompt,
    userPrompt,
    maxTokens: 3000,
  });

  // Merge with known submission URLs
  return (result.data.listings || []).map((listing) => {
    const known = DIRECTORIES.find(
      (d) => d.name.toLowerCase() === listing.directory_name.toLowerCase()
    );
    return {
      ...listing,
      submission_url: listing.submission_url || known?.submit || listing.directory_url,
    };
  });
}
