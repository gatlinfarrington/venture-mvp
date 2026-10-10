import { brand } from "@/lib/brand";
import { getAllBlogPosts } from "@/lib/content/blog";
import { siteConfig } from "@/lib/site";

export const dynamic = "force-static";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function GET() {
  const posts = getAllBlogPosts();
  const base = siteConfig.url;

  const items = posts
    .map((post) => {
      const link = `${base}/blog/${post.slug}`;
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${link}</link>
      <guid>${link}</guid>
      <pubDate>${new Date(`${post.date}T12:00:00.000Z`).toUTCString()}</pubDate>
      <description>${escapeXml(post.description)}</description>
      ${post.tags.map((t) => `<category>${escapeXml(t)}</category>`).join("\n      ")}
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(brand.name)} Blog</title>
    <link>${base}/blog</link>
    <description>${escapeXml(`Notes from ${brand.name} on Sheets-native revenue and sync.`)}</description>
    <language>en-us</language>
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate",
    },
  });
}
