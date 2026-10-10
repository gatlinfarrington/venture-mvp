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

/**
 * Canonical site origin for metadata, sitemap, and absolute links.
 * Prefer NEXT_PUBLIC_SITE_URL; else https://${VERCEL_PROJECT_PRODUCTION_URL};
 * local fallback is http://localhost:3000 — never a hardcoded custom domain.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return stripTrailingSlash(explicit);

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

/** @deprecated Use marketplaceUrl() — null when no listing is configured. */
export function installUrl(): string | null {
  return marketplaceUrl();
}
