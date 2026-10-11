import type { MetadataRoute } from "next";
import { getAllBlogPosts } from "@/lib/content/blog";
import { getBlogTags } from "@/lib/content/blog";
import { seoPages } from "@/lib/seo-pages";
import { siteConfig } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url;
  const staticRoutes = [
    "",
    "/pricing",
    "/sample",
    "/about",
    "/security",
    "/support",
    "/docs",
    "/docs/setup/lemon-squeezy",
    "/docs/setup/polar",
    "/docs/setup/gumroad",
    "/docs/setup/stripe",
    "/docs/csv-import",
    "/docs/api-keys",
    "/docs/mrr-and-churn",
    "/docs/faq",
    "/docs/troubleshooting",
    "/blog",
    "/changelog",
    "/privacy",
    "/terms",
    "/vs/baremetrics",
    "/vs/chartmogul",
    "/vs/zapier",
    "/vs/polar-dashboard",
    // /success is post-checkout only: kept out of the sitemap and disallowed in robots.ts
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority:
      path === ""
        ? 1
        : path.startsWith("/docs")
          ? 0.7
          : path.startsWith("/vs/")
            ? 0.75
            : 0.6,
  }));

  const guides = seoPages.map((p) => ({
    url: `${base}/${p.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const posts = getAllBlogPosts().map((p) => ({
    url: `${base}/blog/${p.slug}`,
    lastModified: new Date(p.date),
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));

  const tags = getBlogTags().map((tag) => ({
    url: `${base}/blog/tag/${encodeURIComponent(tag)}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));

  return [...staticRoutes, ...guides, ...posts, ...tags];
}
