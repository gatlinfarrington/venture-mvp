import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { EXTRA_SMOKE_ROUTES, SITEMAP_ROUTES_FALLBACK } from "./routes";

/** Docs + privacy may still mention Marketplace; leave them alone. */
function routesWithoutMarketplaceAllowlist(): string[] {
  const staticRoutes = [...SITEMAP_ROUTES_FALLBACK, ...EXTRA_SMOKE_ROUTES].filter(
    (r) => r !== "/privacy" && !r.startsWith("/docs"),
  );
  const blogDir = path.join(process.cwd(), "content/blog");
  const blogRoutes = fs
    .readdirSync(blogDir)
    .filter((f) => f.endsWith(".mdx"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(blogDir, file), "utf8");
      const { data } = matter(raw);
      return { slug: file.replace(/\.mdx$/, ""), draft: Boolean(data.draft) };
    })
    .filter((p) => !p.draft)
    .map((p) => `/blog/${p.slug}`);
  return [...new Set([...staticRoutes, ...blogRoutes])];
}

test.describe("no Marketplace on rendered pages", () => {
  for (const route of routesWithoutMarketplaceAllowlist()) {
    test(`${route} body has no Marketplace`, async ({ page }) => {
      const res = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(res, `navigation to ${route}`).not.toBeNull();
      expect(res!.status(), `${route} status`).toBeLessThan(400);
      const text = await page.locator("body").innerText();
      expect(text, `${route} still mentions Marketplace`).not.toMatch(/Marketplace/i);
    });
  }
});
