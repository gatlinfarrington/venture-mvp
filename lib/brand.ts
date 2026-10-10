/**
 * Single place to rename the product before launch.
 * Swap `name`, `domain`, logo paths, and legal entity — everything else reads from here.
 */
export const brand = {
  /** Display name used in UI, metadata, and copy. */
  name: "RevenueSheet",
  /** Working title while the final name is pending. */
  nameStatus: "placeholder" as const,
  /** Primary public hostname (no protocol). */
  domain: "revenuesheet.app",
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

export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? `https://${brand.domain}`;
}

export function installUrl(): string {
  return (
    process.env.NEXT_PUBLIC_INSTALL_URL ??
    "https://workspace.google.com/marketplace"
  );
}
