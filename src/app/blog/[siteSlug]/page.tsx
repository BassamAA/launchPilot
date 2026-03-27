import Link from "next/link";
import { notFound } from "next/navigation";
import { getBlogFeedData } from "@/lib/publishing";
import { extractTextExcerpt } from "@/lib/markdown";
import { ContentItem, ContentMetadata } from "@/types";

export async function generateMetadata({ params }: { params: { siteSlug: string } }) {
  const data = await getBlogFeedData(params.siteSlug);
  if (!data) {
    return { title: "Blog not found" };
  }

  return {
    title: `${data.site.name} Blog`,
    description: `Latest LaunchPilot-hosted posts for ${data.site.name}.`,
    alternates: {
      canonical: `/blog/${params.siteSlug}`,
    },
    openGraph: {
      title: `${data.site.name} Blog`,
      description: `Latest LaunchPilot-hosted posts for ${data.site.name}.`,
      url: `/blog/${params.siteSlug}`,
      type: "website",
    },
  };
}

export default async function HostedBlogIndexPage({
  params,
}: {
  params: { siteSlug: string };
}) {
  const data = await getBlogFeedData(params.siteSlug);
  if (!data) notFound();

  const posts = data.posts as ContentItem[];

  return (
    <main className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <div className="mb-12 rounded-[2rem] bg-white p-10 shadow-sm ring-1 ring-stone-200">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-700">
            LaunchPilot Hosted Blog
          </p>
          <h1 className="mt-4 font-serif text-5xl text-stone-900">{data.site.name}</h1>
          <p className="mt-4 max-w-2xl text-lg text-stone-600">
            Marketing content published by LaunchPilot. Subscribe via the RSS feed or browse the latest posts below.
          </p>
          <div className="mt-6 flex flex-wrap gap-4 text-sm">
            <a href={`/blog/${params.siteSlug}/feed.xml`} className="text-emerald-700 hover:underline">
              RSS feed
            </a>
            <a href={`/blog/${params.siteSlug}/sitemap.xml`} className="text-emerald-700 hover:underline">
              Blog sitemap
            </a>
          </div>
        </div>

        <div className="space-y-6">
          {posts.map((post) => {
            const metadata = (post.metadata_json || {}) as ContentMetadata;
            return (
              <article key={post.id} className="rounded-[1.5rem] bg-white p-8 shadow-sm ring-1 ring-stone-200">
                <p className="text-sm uppercase tracking-[0.18em] text-stone-400">
                  {post.published_date
                    ? new Date(post.published_date).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Draft"}
                </p>
                <h2 className="mt-3 font-serif text-3xl text-stone-900">
                  <Link href={`/blog/${params.siteSlug}/${metadata.post_slug}`} className="hover:text-emerald-700">
                    {post.title}
                  </Link>
                </h2>
                <p className="mt-4 text-base leading-7 text-stone-600">
                  {metadata.meta_description || extractTextExcerpt(post.body, 220)}
                </p>
                <div className="mt-6">
                  <Link
                    href={`/blog/${params.siteSlug}/${metadata.post_slug}`}
                    className="inline-flex items-center text-sm font-semibold text-emerald-700 hover:underline"
                  >
                    Read post
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
