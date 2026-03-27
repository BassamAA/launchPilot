import { getBlogFeedData } from "@/lib/publishing";
import { ContentItem, ContentMetadata } from "@/types";

export async function GET(
  req: Request,
  { params }: { params: { siteSlug: string } }
) {
  const data = await getBlogFeedData(params.siteSlug);
  if (!data) {
    return new Response("Not found", { status: 404 });
  }

  const origin = new URL(req.url).origin;
  const urls = [
    `<url><loc>${origin}/blog/${params.siteSlug}</loc></url>`,
    ...(data.posts as ContentItem[]).map((post) => {
      const metadata = (post.metadata_json || {}) as ContentMetadata;
      return `<url><loc>${origin}/blog/${params.siteSlug}/${metadata.post_slug}</loc><lastmod>${new Date(post.updated_at).toISOString()}</lastmod></url>`;
    }),
  ].join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${urls}
  </urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
