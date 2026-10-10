import type { Metadata } from "next";
import Link from "next/link";
import { LaunchInvite } from "@/components/LaunchInvite";
import { brand } from "@/lib/brand";
import { blogTagLabel } from "@/lib/blog-tags";
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
  const [featured, ...rest] = posts;

  return (
    <main className="legal container page-shell blog-index">
      <p className="eyebrow">Writing</p>
      <h1>Blog</h1>
      <p className="body-lg muted page-lede">
        Product notes and setup guidance from the add-on and the sheet.
      </p>
      {tags.length ? (
        <ul className="tag-pills blog-tag-pills">
          {tags.map((tag) => (
            <li key={tag}>
              <Link className="chip" href={`/blog/tag/${encodeURIComponent(tag)}`}>
                {blogTagLabel(tag)}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {featured ? (
        <article className="blog-featured">
          <time className="mono muted" dateTime={featured.date}>
            {featured.date}
          </time>
          <h2 className="blog-featured-title">
            <Link href={`/blog/${featured.slug}`}>{featured.title}</Link>
          </h2>
          <p className="muted blog-featured-excerpt">{featured.description}</p>
          {featured.tags.length ? (
            <ul className="tag-pills">
              {featured.tags.map((tag) => (
                <li key={tag}>
                  <Link className="chip" href={`/blog/tag/${encodeURIComponent(tag)}`}>
                    {blogTagLabel(tag)}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </article>
      ) : null}

      {rest.length ? (
        <ol className="blog-dense-list">
          {rest.map((post) => (
            <li key={post.slug}>
              <time className="mono muted" dateTime={post.date}>
                {post.date}
              </time>
              <Link href={`/blog/${post.slug}`}>{post.title}</Link>
              <span className="blog-dense-tags mono muted">
                {post.tags.map(blogTagLabel).join(" · ")}
              </span>
            </li>
          ))}
        </ol>
      ) : null}

      <aside className="blog-launch-rail">
        <h2 className="h3">Get the launch email</h2>
        <LaunchInvite source="blog-index" />
      </aside>
    </main>
  );
}
