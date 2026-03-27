import * as cheerio from "cheerio";
import { WebsiteAnalysis } from "@/lib/analyzers/types";

interface ExtractedSiteContent {
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

function normalizeUrl(url: string) {
  return url.startsWith("http") ? url : `https://${url}`;
}

async function fetchHtml(url: string) {
  const response = await fetch(normalizeUrl(url), {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; LaunchPilot/1.0; +https://launchpilot.app)",
      Accept: "text/html",
    },
    next: { revalidate: 0 },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
  }

  return response.text();
}

function extractPricing($: ReturnType<typeof cheerio.load>): string[] {
  const pricing: string[] = [];

  $("[class*='pric'], [id*='pric'], [class*='plan'], [id*='plan']").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 0 && text.length < 500) {
      pricing.push(text.replace(/\s+/g, " "));
    }
  });

  const allText = $("body").text();
  const priceMatches = allText.match(/\$\d+(?:\.\d{2})?(?:\s*\/\s*(?:mo|month|year|yr))?/gi);
  if (priceMatches) {
    pricing.push(...priceMatches.slice(0, 10));
  }

  return [...new Set(pricing)].slice(0, 5);
}

function extractTestimonials($: ReturnType<typeof cheerio.load>): string[] {
  const testimonials: string[] = [];
  $("[class*='testimonial'], [class*='review'], [class*='quote'], blockquote").each((_, el) => {
    const text = $(el).text().trim().replace(/\s+/g, " ");
    if (text.length > 20 && text.length < 300) testimonials.push(text);
  });
  return testimonials.slice(0, 5);
}

function extractFeatures($: ReturnType<typeof cheerio.load>, h2s: string[], h3s: string[]) {
  const features: string[] = [];
  $("[class*='feature'], [class*='benefit'], [class*='capability']").each((_, el) => {
    const text = $(el).text().trim().replace(/\s+/g, " ");
    if (text.length > 10 && text.length < 200) features.push(text);
  });
  features.push(...h2s.slice(0, 8), ...h3s.slice(0, 6));
  return [...new Set(features)].slice(0, 15);
}

function extractCTAs($: ReturnType<typeof cheerio.load>) {
  const ctas: string[] = [];
  $("button, a[class*='btn'], a[class*='cta'], [class*='button']").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 2 && text.length < 60) ctas.push(text);
  });
  return [...new Set(ctas)].slice(0, 10);
}

function extractTechStack(html: string) {
  const lower = html.toLowerCase();
  const matches = [
    { key: "next.js", test: /_next|next\/image|next\/script/ },
    { key: "react", test: /react|__next_data__/ },
    { key: "shopify", test: /cdn\.shopify|shopify/ },
    { key: "webflow", test: /webflow/ },
    { key: "wordpress", test: /wp-content|wordpress/ },
    { key: "framer", test: /framer/ },
  ];

  return matches.filter((entry) => entry.test.test(lower)).map((entry) => entry.key);
}

function extractContent(html: string): ExtractedSiteContent {
  const $ = cheerio.load(html);
  $("script, style, noscript, iframe, [aria-hidden='true']").remove();

  const title = $("title").text().trim() || $("h1").first().text().trim();
  const metaDescription =
    $('meta[name="description"]').attr("content")?.trim() ||
    $('meta[property="og:description"]').attr("content")?.trim() ||
    "";

  const h1s = $("h1").map((_, el) => $(el).text().trim()).get().filter(Boolean);
  const h2s = $("h2").map((_, el) => $(el).text().trim()).get().filter(Boolean);
  const h3s = $("h3").map((_, el) => $(el).text().trim()).get().filter(Boolean);

  const bodyText = $("p, li")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter((text) => text.length > 20)
    .slice(0, 50)
    .join(" ");

  const navLinks = $("nav a, header a")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter((text) => text.length > 1 && text.length < 30);

  return {
    title,
    metaDescription,
    h1s,
    h2s,
    h3s,
    bodyText: bodyText.slice(0, 3000),
    pricing: extractPricing($),
    testimonials: extractTestimonials($),
    features: extractFeatures($, h2s, h3s),
    ctas: extractCTAs($),
    navLinks,
  };
}

export function formatWebsiteForAnalysis(analysis: WebsiteAnalysis) {
  const sections = [
    `WEBSITE URL: ${analysis.url}`,
    `TITLE: ${analysis.title}`,
    `DESCRIPTION: ${analysis.description}`,
  ];

  if (analysis.headings.length) sections.push(`HEADINGS:\n${analysis.headings.join("\n")}`);
  if (analysis.ctas.length) sections.push(`CALL TO ACTIONS:\n${analysis.ctas.join(", ")}`);
  if (analysis.features.length) sections.push(`FEATURES:\n${analysis.features.join("\n")}`);
  if (analysis.pricing) sections.push(`PRICING:\n${analysis.pricing}`);
  if (analysis.testimonials.length) sections.push(`TESTIMONIALS:\n${analysis.testimonials.join("\n")}`);
  if (analysis.bodyText) sections.push(`BODY TEXT:\n${analysis.bodyText}`);

  return sections.join("\n\n");
}

export async function analyzeWebsite(url: string): Promise<WebsiteAnalysis> {
  const normalized = normalizeUrl(url);
  const html = await fetchHtml(normalized);
  const extracted = extractContent(html);

  return {
    source: "website",
    url: normalized,
    title: extracted.title,
    description: extracted.metaDescription,
    headings: [...extracted.h1s, ...extracted.h2s, ...extracted.h3s].slice(0, 20),
    bodyText: extracted.bodyText,
    features: extracted.features,
    pricing: extracted.pricing[0] || null,
    testimonials: extracted.testimonials,
    ctas: extracted.ctas,
    techStack: extractTechStack(html),
    raw: extracted as unknown as Record<string, unknown>,
  };
}
