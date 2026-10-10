import type { MetadataRoute } from "next";
import { seoPages } from "@/lib/seo-pages";
import { siteConfig } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url;
  const staticRoutes = [
    "",
    "/pricing",
    "/docs",
    "/docs/setup/lemon-squeezy",
    "/docs/setup/polar",
    "/docs/setup/gumroad",
    "/docs/api-keys",
    "/docs/faq",
    "/docs/troubleshooting",
    "/changelog",
    "/privacy",
    "/terms",
    "/success",
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : path.startsWith("/docs") ? 0.7 : 0.6,
  }));

  const guides = seoPages.map((p) => ({
    url: `${base}/${p.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...guides];
}
