import { BRAND_DOMAIN, BRAND_MARKETING_URL, BRAND_NAME } from "@/lib/brand";

export type MarketingPage = {
  slug: string;
  title: string;
  description: string;
  eyebrow: string;
  hero: string;
  subhero: string;
  problemTitle: string;
  problemBody: string;
  solutionTitle: string;
  solutionBody: string;
  bullets: string[];
  cta: string;
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
};

export const marketingPages: MarketingPage[] = [
  {
    slug: "ai-marketing-for-indie-hackers",
    title: "AI marketing for indie hackers",
    description:
      `${BRAND_NAME} gives indie hackers an execution system for marketing: strategy, content, publishing, and growth tracking without hiring a marketer.`,
    eyebrow: "For builders with no time for marketing",
    hero: "AI marketing for indie hackers who shipped but still have no users",
    subhero:
      `You do not need more generic prompts. You need a system that studies your product, turns it into a plan, writes the content, and keeps publishing until you have traction. ${BRAND_NAME} is built for that.`,
    problemTitle: "Why indie hackers stay invisible",
    problemBody:
      "Most solo founders are not bad at marketing because they lack ideas. They are bad at marketing because they cannot sustain execution. They post once, disappear for two weeks, then start over from zero.",
    solutionTitle: `${BRAND_NAME} acts like a growth operator, not a chatbot`,
    solutionBody:
      `${BRAND_NAME} analyzes your live site, identifies your best acquisition surfaces, generates channel-native content, tracks what gets clicks and signups, and helps you double down on what is working.`,
    bullets: [
      "Turn a live URL into a 30-day marketing plan",
      "Generate blog, X, LinkedIn, Reddit, email, and directory content",
      "Track clicks, signups, activation, and paid conversions",
      "Keep marketing moving even when founder motivation dies",
    ],
    cta: "Start your free trial and analyze your product URL",
    seoTitle: `AI Marketing for Indie Hackers | ${BRAND_NAME}`,
    seoDescription:
      `Use ${BRAND_NAME} to generate and run marketing for your startup: SEO posts, social content, publishing, and growth tracking built for indie hackers.`,
    keywords: [
      "AI marketing for indie hackers",
      "indie hacker marketing",
      "startup marketing automation",
      "AI growth tool for founders",
    ],
  },
  {
    slug: "startup-marketing-without-hiring-a-team",
    title: "Startup marketing without hiring a team",
    description:
      `${BRAND_NAME} helps early-stage startups run consistent marketing without agencies, a content hire, or a full growth team.`,
    eyebrow: "For small teams doing too much already",
    hero: "Run startup marketing without hiring a team",
    subhero:
      `If your product is live but nobody owns distribution, you have a growth problem. ${BRAND_NAME} helps small teams create a repeatable content and acquisition system before they can afford dedicated marketing hires.`,
    problemTitle: "Early startups usually underinvest in distribution",
    problemBody:
      "Founders spend months building the product, then expect customers to appear from one launch post. That almost never works. The issue is not intelligence. It is lack of bandwidth and repetition.",
    solutionTitle: `${BRAND_NAME} gives you repeatability before headcount`,
    solutionBody:
      `Instead of replacing strategy with random AI copy, ${BRAND_NAME} creates a practical execution loop: analyze the product, define positioning, produce content, schedule publishing, and track funnel outcomes.`,
    bullets: [
      "Replace inconsistent founder posting with a weekly execution engine",
      "Prioritize channels based on product and audience fit",
      "Generate assets your team can review and approve quickly",
      "See which surfaces actually create signups and revenue",
    ],
    cta: "See how BreakthroughPilot builds your growth system",
    seoTitle: `Startup Marketing Without Hiring a Team | ${BRAND_NAME}`,
    seoDescription:
      `Run startup marketing without agencies or a full-time team. ${BRAND_NAME} helps founders generate content, publish consistently, and track growth outcomes.`,
    keywords: [
      "startup marketing without a team",
      "startup marketing automation",
      "founder-led marketing system",
      "small startup growth software",
    ],
  },
  {
    slug: "chatgpt-for-marketing-vs-breakthroughpilot",
    title: "ChatGPT for marketing vs BreakthroughPilot",
    description:
      `${BRAND_NAME} is for founders who are tired of starting from a blank prompt every time they need marketing done.`,
    eyebrow: "Blank prompts are not a growth system",
    hero: `Using ChatGPT for marketing is fine. It is still not enough.`,
    subhero:
      `${BRAND_NAME} is what you use when you want execution, not just text generation. It gives you strategy, channel planning, tracked links, publishing workflows, and a feedback loop tied to actual outcomes.`,
    problemTitle: "Why prompt-only marketing breaks down",
    problemBody:
      "ChatGPT can help write. It does not know your product deeply by default, does not maintain a structured plan for every channel, does not manage approvals and publishing, and does not naturally learn from your funnel results.",
    solutionTitle: `${BRAND_NAME} turns AI output into a repeatable operating system`,
    solutionBody:
      `${BRAND_NAME} analyzes your actual product, builds a multi-channel plan, generates content in platform-native formats, creates trackable links, and helps you connect publishing to signups and revenue.`,
    bullets: [
      "Product-aware analysis instead of starting from a blank chat",
      "Structured plan across blog, social, directories, and email",
      "Approval queue and publishing workflows",
      "Performance tracking tied to acquisition surfaces",
    ],
    cta: "Stop prompting from scratch. Start running a real system.",
    seoTitle: `ChatGPT for Marketing vs ${BRAND_NAME}`,
    seoDescription:
      `Compare using ChatGPT for marketing with ${BRAND_NAME}. See why founders need strategy, publishing, and tracking—not just generated copy.`,
    keywords: [
      "ChatGPT for marketing",
      "AI marketing tool vs ChatGPT",
      "marketing automation for founders",
      "content system for startups",
    ],
  },
];

export function getMarketingPage(slug: string) {
  return marketingPages.find((page) => page.slug === slug) || null;
}

export function absoluteUrl(path = "") {
  if (!path) return BRAND_MARKETING_URL;
  return `${BRAND_MARKETING_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: BRAND_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: BRAND_MARKETING_URL,
    description:
      `${BRAND_NAME} is an AI marketing autopilot for founders and small teams. It analyzes a live product, creates strategy, generates content, and tracks growth outcomes.`,
    offers: {
      "@type": "Offer",
      price: "49",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    brand: {
      "@type": "Brand",
      name: BRAND_NAME,
    },
    publisher: {
      "@type": "Organization",
      name: BRAND_NAME,
      url: BRAND_MARKETING_URL,
    },
  };
}

export function buildWebPageJsonLd(input: { title: string; description: string; path: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: input.title,
    description: input.description,
    url: absoluteUrl(input.path),
    isPartOf: {
      "@type": "WebSite",
      name: BRAND_NAME,
      url: BRAND_MARKETING_URL,
    },
    about: {
      "@type": "Thing",
      name: `${BRAND_NAME} marketing automation`,
    },
  };
}

export function buildFaqJsonLd(faqs: Array<{ q: string; a: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };
}

export const defaultMarketingKeywords = [
  "AI marketing autopilot",
  "startup marketing automation",
  "indie hacker marketing",
  "founder growth software",
  BRAND_DOMAIN,
];
