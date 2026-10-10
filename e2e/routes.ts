/** Fallback sitemap paths — kept in sync with app/sitemap.ts static routes + seoPages. */
export const SITEMAP_ROUTES_FALLBACK = [
  "/",
  "/pricing",
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
  "/docs/faq",
  "/docs/troubleshooting",
  "/blog",
  "/changelog",
  "/privacy",
  "/terms",
  "/gumroad-analytics-google-sheets",
  "/stripe-to-google-sheets",
  "/polar-analytics",
  "/lemon-squeezy-analytics",
  "/vs/baremetrics",
  "/vs/chartmogul",
  "/vs/zapier",
] as const;

/** Key marketing pages for Lighthouse CI budgets (≥95). */
export const LIGHTHOUSE_ROUTES = ["/", "/pricing", "/docs", "/privacy"] as const;

/** Public pages intentionally omitted from the sitemap (e.g. noindex). */
export const EXTRA_SMOKE_ROUTES = ["/success"] as const;

export async function fetchSitemapRoutes(baseURL: string): Promise<string[]> {
  const sitemapUrl = new URL("/sitemap.xml", baseURL).toString();
  const res = await fetch(sitemapUrl);
  if (!res.ok) {
    return [...SITEMAP_ROUTES_FALLBACK];
  }
  const xml = await res.text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const paths = locs
    .map((loc) => {
      try {
        const u = new URL(loc);
        return u.pathname || "/";
      } catch {
        return null;
      }
    })
    .filter((p): p is string => Boolean(p));

  const unique = [...new Set(paths.map((p) => (p === "" ? "/" : p)))];
  return unique.length > 0 ? unique : [...SITEMAP_ROUTES_FALLBACK];
}

/** Sitemap routes plus intentional extras (deduped). */
export async function fetchAllSmokeRoutes(baseURL: string): Promise<string[]> {
  const fromSitemap = await fetchSitemapRoutes(baseURL);
  return [...new Set([...fromSitemap, ...EXTRA_SMOKE_ROUTES])];
}
