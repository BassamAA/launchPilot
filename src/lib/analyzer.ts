import * as cheerio from "cheerio";

export interface ExtractedSiteContent {
  title: string;
  metaDescription: string;
  h1s: string[];
  h2s: string[];
  h3s: string[];
  bodyText: string;
  pricing: string[];
  testimonials: string[];
  features: string[];
  ctas: string[];
  navLinks: string[];
}

// ─── Crawl a URL and extract marketing-relevant content ─────────────
export async function crawlSite(url: string): Promise<ExtractedSiteContent> {
  const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;

  const response = await fetch(normalizedUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; LaunchPilot/1.0; +https://launchpilot.app)",
      Accept: "text/html",
    },
    next: { revalidate: 0 },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${normalizedUrl}: HTTP ${response.status}`);
  }

  const html = await response.text();
  return extractContent(html);
}

export function extractContent(html: string): ExtractedSiteContent {
  const $ = cheerio.load(html);

  // Remove noise
  $("script, style, noscript, iframe, [aria-hidden='true']").remove();

  const title = $("title").text().trim() || $("h1").first().text().trim();
  const metaDescription =
    $('meta[name="description"]').attr("content")?.trim() ||
    $('meta[property="og:description"]').attr("content")?.trim() ||
    "";

  const h1s = $("h1")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);
  const h2s = $("h2")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);
  const h3s = $("h3")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);

  // Body text — top-level paragraphs and list items
  const bodyText = $("p, li")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter((t) => t.length > 20)
    .slice(0, 50)
    .join(" ");

  // Pricing signals
  const pricing = extractPricing($);

  // Testimonials
  const testimonials = extractTestimonials($);

  // Features
  const features = extractFeatures($, h2s, h3s);

  // CTAs — buttons and prominent links
  const ctas = extractCTAs($);

  // Nav links
  const navLinks = $("nav a, header a")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter((t) => t.length > 1 && t.length < 30);

  return {
    title,
    metaDescription,
    h1s,
    h2s,
    h3s,
    bodyText: bodyText.slice(0, 3000),
    pricing,
    testimonials,
    features,
    ctas,
    navLinks,
  };
}

function extractPricing($: ReturnType<typeof cheerio.load>): string[] {
  const pricing: string[] = [];

  // Look for price patterns: $XX, /month, pricing sections
  $("[class*='pric'], [id*='pric'], [class*='plan'], [id*='plan']").each(
    (_, el) => {
      const text = $(el).text().trim();
      if (text.length > 0 && text.length < 500) {
        pricing.push(text.replace(/\s+/g, " "));
      }
    }
  );

  // Text pattern matching for prices
  const allText = $("body").text();
  const priceMatches = allText.match(
    /\$\d+(?:\.\d{2})?(?:\s*\/\s*(?:mo|month|year|yr))?/gi
  );
  if (priceMatches) {
    pricing.push(...priceMatches.slice(0, 10));
  }

  return [...new Set(pricing)].slice(0, 5);
}

function extractTestimonials(
  $: ReturnType<typeof cheerio.load>
): string[] {
  const testimonials: string[] = [];

  $(
    "[class*='testimonial'], [class*='review'], [class*='quote'], blockquote"
  ).each((_, el) => {
    const text = $(el).text().trim().replace(/\s+/g, " ");
    if (text.length > 20 && text.length < 300) {
      testimonials.push(text);
    }
  });

  return testimonials.slice(0, 5);
}

function extractFeatures(
  $: ReturnType<typeof cheerio.load>,
  h2s: string[],
  h3s: string[]
): string[] {
  const features: string[] = [];

  // Feature sections
  $(
    "[class*='feature'], [class*='benefit'], [class*='capability']"
  ).each((_, el) => {
    const text = $(el).text().trim().replace(/\s+/g, " ");
    if (text.length > 10 && text.length < 200) {
      features.push(text);
    }
  });

  // H2/H3 under features section
  features.push(...h2s.slice(0, 8), ...h3s.slice(0, 6));

  return [...new Set(features)].slice(0, 15);
}

function extractCTAs($: ReturnType<typeof cheerio.load>): string[] {
  const ctas: string[] = [];

  $("button, a[class*='btn'], a[class*='cta'], [class*='button']").each(
    (_, el) => {
      const text = $(el).text().trim();
      if (text.length > 2 && text.length < 60) {
        ctas.push(text);
      }
    }
  );

  return [...new Set(ctas)].slice(0, 10);
}

// ─── Format extracted content for Claude prompt ──────────────────────
export function formatForAnalysis(content: ExtractedSiteContent): string {
  const sections: string[] = [];

  sections.push(`PAGE TITLE: ${content.title}`);
  if (content.metaDescription)
    sections.push(`META DESCRIPTION: ${content.metaDescription}`);

  if (content.h1s.length)
    sections.push(`H1 HEADLINES:\n${content.h1s.join("\n")}`);
  if (content.h2s.length)
    sections.push(`H2 SUBHEADINGS:\n${content.h2s.slice(0, 10).join("\n")}`);
  if (content.ctas.length)
    sections.push(`CALL TO ACTIONS:\n${content.ctas.join(", ")}`);
  if (content.features.length)
    sections.push(`FEATURES/BENEFITS:\n${content.features.slice(0, 10).join("\n")}`);
  if (content.pricing.length)
    sections.push(`PRICING INFO:\n${content.pricing.join("\n")}`);
  if (content.testimonials.length)
    sections.push(`TESTIMONIALS:\n${content.testimonials.join("\n")}`);
  if (content.bodyText)
    sections.push(`PAGE CONTENT (EXCERPT):\n${content.bodyText}`);

  return sections.join("\n\n");
}
