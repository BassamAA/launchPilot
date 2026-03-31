import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Script from "next/script";
import { Button } from "@/components/ui";
import { BRAND_NAME } from "@/lib/brand";
import { buildWebPageJsonLd, getMarketingPage } from "@/lib/seo";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const page = getMarketingPage(params.slug);
  if (!page) {
    return { title: "Not found" };
  }

  return {
    title: page.seoTitle,
    description: page.seoDescription,
    keywords: page.keywords,
    alternates: {
      canonical: `/${page.slug}`,
    },
    openGraph: {
      title: page.seoTitle,
      description: page.seoDescription,
      url: `/${page.slug}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: page.seoTitle,
      description: page.seoDescription,
    },
  };
}

export function generateStaticParams() {
  return [
    { slug: "ai-marketing-for-indie-hackers" },
    { slug: "startup-marketing-without-hiring-a-team" },
    { slug: "chatgpt-for-marketing-vs-breakthroughpilot" },
  ];
}

export default function MarketingPage({ params }: { params: { slug: string } }) {
  const page = getMarketingPage(params.slug);
  if (!page) notFound();

  const jsonLd = buildWebPageJsonLd({
    title: page.seoTitle,
    description: page.seoDescription,
    path: `/${page.slug}`,
  });

  return (
    <main className="min-h-screen bg-white">
      <Script id={`jsonld-${page.slug}`} type="application/ld+json">
        {JSON.stringify(jsonLd)}
      </Script>

      <section className="border-b border-gray-100 bg-gradient-to-b from-brand-50 to-white px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-700">{page.eyebrow}</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">{page.hero}</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-gray-600">{page.subhero}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup">
              <Button size="lg">Start free trial</Button>
            </Link>
            <Link href="/signup?url=https%3A%2F%2Fyourproduct.com" className="inline-flex items-center rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              Analyze a product URL
            </Link>
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
          <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900">{page.problemTitle}</h2>
            <p className="mt-4 leading-7 text-gray-600">{page.problemBody}</p>
          </div>
          <div className="rounded-3xl border border-brand-100 bg-brand-50 p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900">{page.solutionTitle}</h2>
            <p className="mt-4 leading-7 text-gray-700">{page.solutionBody}</p>
          </div>
        </div>
      </section>

      <section className="bg-gray-50 px-6 py-20">
        <div className="mx-auto max-w-5xl rounded-3xl border border-gray-100 bg-white p-10 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900">What you actually need to grow</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {page.bullets.map((bullet) => (
              <div key={bullet} className="rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4 text-sm text-gray-700">
                {bullet}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl rounded-3xl bg-gray-900 px-8 py-12 text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-200">Next step</p>
          <h2 className="mt-4 text-3xl font-bold">{page.cta}</h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-gray-300">
            {BRAND_NAME} is for founders and small teams who already shipped the product and now need a repeatable way to get discovered, publish content, and learn what converts.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup">
              <Button size="lg">Start free trial</Button>
            </Link>
            <Link href="/" className="inline-flex items-center rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">
              Back to homepage
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
