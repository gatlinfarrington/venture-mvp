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
    "Lemon Squeezy, Polar and Gumroad revenue, synced on a schedule into Google Sheets, with an MRR dashboard built for you.",
  taglineShort: "Google Sheets add-on",
  /** Logo concept currently shipping (Ledger Cell = c3). */
  logo: {
    concept: "Ledger Cell",
    conceptId: "c3",
    mark: "/design/logo-mark.svg",
    markAlt: "Ledger Cell mark — 3×3 grid with rising diagonal",
    icon32: "/design/icon-32.png",
    icon128: "/design/icon-128.png",
  },
  legal: {
    entity: "RevenueSheet",
    /** @deprecated Use `supportEmail()` from `@/lib/support` — empty until SUPPORT_EMAIL is set. */
    supportEmail: "",
    /** @deprecated Use `privacyEmail()` from `@/lib/support` when set. */
    privacyEmail: "",
  },
  sources: ["Lemon Squeezy", "Polar", "Gumroad"] as const,
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

export function installUrl(): string {
  return (
    process.env.NEXT_PUBLIC_MARKETPLACE_URL?.trim() ||
    process.env.NEXT_PUBLIC_INSTALL_URL?.trim() ||
    "https://workspace.google.com/marketplace"
  );
}
