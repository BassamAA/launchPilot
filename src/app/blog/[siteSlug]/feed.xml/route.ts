import { getBlogFeedData } from "@/lib/publishing";
import { extractTextExcerpt } from "@/lib/markdown";
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
  const items = (data.posts as ContentItem[])
    .map((post) => {
      const metadata = (post.metadata_json || {}) as ContentMetadata;
      const link = `${origin}/blog/${params.siteSlug}/${metadata.post_slug}`;
      return `
        <item>
          <title><![CDATA[${post.title}]]></title>
          <link>${link}</link>
          <guid>${link}</guid>
          <pubDate>${new Date(post.published_date || post.created_at).toUTCString()}</pubDate>
          <description><![CDATA[${metadata.meta_description || extractTextExcerpt(post.body, 180)}]]></description>
        </item>
      `;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <rss version="2.0">
    <channel>
      <title>${data.site.name} Blog</title>
      <link>${origin}/blog/${params.siteSlug}</link>
      <description>Hosted blog for ${data.site.name}</description>
      ${items}
    </channel>
  </rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
