import { notFound } from "next/navigation";
import Script from "next/script";
import { getBlogFeedData } from "@/lib/publishing";
import { renderMarkdown, extractTextExcerpt } from "@/lib/markdown";
import { ContentItem, ContentMetadata } from "@/types";

export async function generateMetadata({
  params,
}: {
  params: { siteSlug: string; postSlug: string };
}) {
  const data = await getBlogFeedData(params.siteSlug);
  const post = (data?.posts as ContentItem[] | undefined)?.find(
    (candidate) => ((candidate.metadata_json || {}) as ContentMetadata).post_slug === params.postSlug
  );

  if (!data || !post) {
    return { title: "Post not found" };
  }

  const metadata = (post.metadata_json || {}) as ContentMetadata;
  const description = metadata.meta_description || extractTextExcerpt(post.body, 180);

  return {
    title: post.title,
    description,
    alternates: {
      canonical: `/blog/${params.siteSlug}/${params.postSlug}`,
    },
    openGraph: {
      title: post.title,
      description,
      url: `/blog/${params.siteSlug}/${params.postSlug}`,
      type: "article",
    },
  };
}

export default async function HostedBlogPostPage({
  params,
}: {
  params: { siteSlug: string; postSlug: string };
}) {
  const data = await getBlogFeedData(params.siteSlug);
  if (!data) notFound();

  const post = (data.posts as ContentItem[]).find(
    (candidate) => ((candidate.metadata_json || {}) as ContentMetadata).post_slug === params.postSlug
  );

  if (!post) notFound();

  return (
    <main className="min-h-screen bg-stone-50">
      <Script id={`track-blog-${post.id}`} strategy="afterInteractive">
        {`
          (function () {
            try {
              var payload = JSON.stringify({
                content_item_id: ${JSON.stringify(post.id)},
                referrer: document.referrer || "",
                user_agent: navigator.userAgent || ""
              });
              if (navigator.sendBeacon) {
                navigator.sendBeacon("/api/track", new Blob([payload], { type: "application/json" }));
                return;
              }
              fetch("/api/track", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: payload,
                keepalive: true
              });
            } catch (error) {
              console.error("LaunchPilot blog tracking failed", error);
            }
          })();
        `}
      </Script>
      <article className="mx-auto max-w-3xl px-6 py-16">
        <div className="rounded-[2rem] bg-white p-10 shadow-sm ring-1 ring-stone-200">
          <p className="text-sm uppercase tracking-[0.18em] text-stone-400">
            {post.published_date
              ? new Date(post.published_date).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })
              : "Draft"}
          </p>
          <h1 className="mt-4 font-serif text-5xl leading-tight text-stone-900">{post.title}</h1>
          <p className="mt-4 text-base text-stone-500">By {data.site.name}</p>

          <div
            className="prose prose-stone mt-10 max-w-none [&_a]:text-emerald-700 [&_code]:rounded [&_code]:bg-stone-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_h1]:font-serif [&_h2]:mt-10 [&_h2]:font-serif [&_h3]:mt-8 [&_ul]:list-disc [&_ul]:pl-5"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(post.body) }}
          />
        </div>
      </article>
    </main>
  );
}
