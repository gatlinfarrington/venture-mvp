import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LaunchInvite } from "@/components/LaunchInvite";
import { MdxContent } from "@/components/MdxContent";
import { blogTagLabel } from "@/lib/blog-tags";
import { brand } from "@/lib/brand";
import { getAllBlogPosts, getBlogPost } from "@/lib/content/blog";
import { siteConfig } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getAllBlogPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};
  const url = `${siteConfig.url}/blog/${post.slug}`;
  const ogImage = `${siteConfig.url}/blog/${post.slug}/opengraph-image`;
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url,
      publishedTime: post.date,
      tags: post.tags,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: [ogImage],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const url = `${siteConfig.url}/blog/${post.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    author: {
      "@type": "Organization",
      name: brand.name,
      url: siteConfig.url,
    },
    publisher: {
      "@type": "Organization",
      name: brand.name,
      url: siteConfig.url,
    },
    mainEntityOfPage: url,
    keywords: post.tags.join(", "),
  };

  return (
    <main className="legal container blog-post">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <p className="eyebrow">
        <Link href="/blog">Blog</Link>
      </p>
      <h1>{post.title}</h1>
      <p className="mono muted" style={{ marginBottom: "var(--space-8)" }}>
        <time dateTime={post.date}>{post.date}</time>
        {" · "}
        {post.tags.map((tag, i) => (
          <span key={tag}>
            {i > 0 ? ", " : null}
            <Link href={`/blog/tag/${encodeURIComponent(tag)}`}>{blogTagLabel(tag)}</Link>
          </span>
        ))}
      </p>
      <div className="prose">
        <MdxContent source={post.body} />
      </div>
      <aside className="blog-launch-rail">
        <h2 className="h3">Get the launch email</h2>
        <LaunchInvite source={`blog-${post.slug}`} />
      </aside>
    </main>
  );
}
