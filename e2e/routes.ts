/** Routes listed in app/sitemap.ts — keep in sync when sitemap changes. */
export const SITEMAP_ROUTES = [
  "/",
  "/privacy",
  "/terms",
  "/success",
  "/polar-to-google-sheets",
  "/lemon-squeezy-to-google-sheets",
  "/gumroad-to-google-sheets",
  "/mrr-spreadsheet-template",
] as const;

export type SitemapRoute = (typeof SITEMAP_ROUTES)[number];

/** Key pages for Lighthouse CI budgets. */
export const LIGHTHOUSE_ROUTES = ["/", "/privacy", "/terms", "/success"] as const;
