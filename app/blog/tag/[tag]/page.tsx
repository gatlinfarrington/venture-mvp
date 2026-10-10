import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { brand } from "@/lib/brand";
import { getBlogPostsByTag, getBlogTags } from "@/lib/content/blog";
import { siteConfig } from "@/lib/site";

type Props = { params: Promise<{ tag: string }> };

export function generateStaticParams() {
  return getBlogTags().map((tag) => ({ tag }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  return {
    title: `Blog · ${decoded}`,
    description: `Posts tagged “${decoded}” on the ${brand.name} blog.`,
    alternates: { canonical: `${siteConfig.url}/blog/tag/${encodeURIComponent(decoded)}` },
  };
}

export default async function BlogTagPage({ params }: Props) {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  const posts = getBlogPostsByTag(decoded);
  if (!posts.length) notFound();

  return (
    <main className="legal container">
      <p className="eyebrow">
        <Link href="/blog">Blog</Link> · tag
      </p>
      <h1>{decoded}</h1>
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
