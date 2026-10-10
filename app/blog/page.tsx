import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/lib/brand";
import { getAllBlogPosts, getBlogTags } from "@/lib/content/blog";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Blog",
  description: `Notes from ${brand.name} on Sheets-native revenue, sync, and storefront ops.`,
  alternates: { canonical: `${siteConfig.url}/blog` },
  openGraph: {
    title: `Blog · ${brand.name}`,
    description: `Notes from ${brand.name} on Sheets-native revenue and sync.`,
    url: `${siteConfig.url}/blog`,
  },
};

export default function BlogIndexPage() {
  const posts = getAllBlogPosts();
  const tags = getBlogTags();

  return (
    <main className="legal container page-shell">
      <p className="eyebrow">Writing</p>
      <h1>Blog</h1>
      <p className="body-lg muted page-lede">
        Product notes and setup guidance. Subscribe via <a href="/blog/rss.xml">RSS</a>.
      </p>
      {tags.length ? (
        <ul className="tag-pills blog-tag-pills">
          {tags.map((tag) => (
            <li key={tag}>
              <Link className="tag-pill mono" href={`/blog/tag/${encodeURIComponent(tag)}`}>
                {tag}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <ol className="blog-index-list">
        {posts.map((post) => (
          <li key={post.slug} className="blog-index-item">
            <time className="mono muted" dateTime={post.date}>
              {post.date}
            </time>
            <div>
              <h2>
                <Link href={`/blog/${post.slug}`}>{post.title}</Link>
              </h2>
              <p className="muted">{post.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </main>
  );
}
