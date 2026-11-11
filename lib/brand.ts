/**
 * Single place to rename the product before launch.
 * Swap `name`, logo paths, and legal entity — everything else reads from here.
 * Public URLs never hardcode a custom domain; see `siteUrl()`.
 */
export const brand = {
  /** Display name used in UI, metadata, and copy. */
  name: "RevenueSheet",
  /** Working title while the final name is pending. */
  nameStatus: "placeholder" as const,
  pitch: "All your stores, in a sheet you own.",
  description:
    "Lemon Squeezy, Polar, Gumroad and Stripe revenue, synced into Google Sheets on a schedule, with an MRR dashboard built for you.",
  /** Meta / Open Graph: includes Stripe + CSV (hero lede stays `description`). */
  metaDescription:
    "Lemon Squeezy, Polar, Gumroad and Stripe revenue, plus CSV import, synced into Google Sheets on a schedule, with an MRR dashboard built for you.",
  taglineShort: "Google Sheets add-on",
  /** Logo concept currently shipping (Ledger Cell = c3). */
  logo: {
    concept: "Ledger Cell",
    conceptId: "c3",
    mark: "/design/logo-mark.svg",
    markAlt: "RevenueSheet",
    icon32: "/design/icon-32.png",
    icon128: "/design/icon-128.png",
  },
  legal: {
    entity: "RevenueSheet",
    /** @deprecated Prefer /support. */
    supportEmail: "",
    /** @deprecated Prefer /support or PRIVACY_EMAIL when set. */
    privacyEmail: "",
  },
  sources: ["Lemon Squeezy", "Polar", "Gumroad", "Stripe"] as const,
  social: {
    x: "",
  },
} as const;

export type Brand = typeof brand;

function stripTrailingSlash(url: string) {
  return url.replace(/\/+$/, "");
}

/** Production canonical — avoids *.vercel.app duplicate content. */
export const CANONICAL_SITE_URL = "https://www.revenuesheet.app";

/**
 * Canonical site origin for metadata, sitemap, and absolute links.
 * Prefer NEXT_PUBLIC_SITE_URL; production falls back to www.revenuesheet.app
 * (not *.vercel.app); local fallback is http://localhost:3000.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return stripTrailingSlash(explicit);

  if (
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production"
  ) {
    return CANONICAL_SITE_URL;
  }

  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelHost) {
    if (/^https?:\/\//i.test(vercelHost)) return stripTrailingSlash(vercelHost);
    return `https://${stripTrailingSlash(vercelHost)}`;
  }

  return "http://localhost:3000";
}

/** Hostname derived from `siteUrl()` (for copy that mentions the site). */
export function siteHostname(): string {
  try {
    return new URL(siteUrl()).hostname;
  } catch {
    return "localhost";
  }
}

/**
 * Workspace Marketplace listing when published.
 * Prefer NEXT_PUBLIC_MARKETPLACE_URL, then NEXT_PUBLIC_INSTALL_URL.
 * When unset, Install CTAs open the launch-invite capture (never the generic Marketplace homepage).
 */
export function marketplaceUrl(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_MARKETPLACE_URL?.trim() ||
    process.env.NEXT_PUBLIC_INSTALL_URL?.trim() ||
    "";
  return raw.length > 0 ? raw : null;
}

/** Google Sheets template “Make a copy” link for post-checkout onboarding. */
export function templateCopyUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_TEMPLATE_COPY_URL?.trim() || "";
  // Sheets copy links only — .xlsx overrides belong on templateXlsxUrl().
  if (!raw || /\.xlsx(\?|#|$)/i.test(raw)) return null;
  return raw;
}

/**
 * Public blank .xlsx template for /sample download.
 * Defaults to /revenuesheet-template.xlsx.
 * Override with NEXT_PUBLIC_TEMPLATE_COPY_URL when it points at an .xlsx file
 * (CDN or absolute URL); Sheets “Make a copy” links stay on templateCopyUrl().
 */
export function templateXlsxUrl(): string {
  const raw = process.env.NEXT_PUBLIC_TEMPLATE_COPY_URL?.trim() || "";
  if (raw && /\.xlsx(\?|#|$)/i.test(raw)) return raw;
  return "/revenuesheet-template.xlsx";
}

/** @deprecated Use marketplaceUrl() — null when no listing is configured. */
export function installUrl(): string | null {
  return marketplaceUrl();
}
