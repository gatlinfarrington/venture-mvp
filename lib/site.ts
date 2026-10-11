import { brand, installUrl, siteHostname, siteUrl } from "@/lib/brand";

export const siteConfig = {
  name: brand.name,
  pitch: brand.pitch,
  description: brand.description,
  get url() {
    return siteUrl();
  },
  /** Marketplace listing when set; otherwise CTAs use launch-invite capture. */
  get installUrl() {
    return installUrl();
  },
  sources: brand.sources,
  logo: brand.logo,
  get domain() {
    return siteHostname();
  },
};

/**
 * Paid Checkout UI is on when a real Stripe publishable key is set.
 * The Checkout API uses STRIPE_SECRET_KEY and resolves/creates prices server-side.
 */
export const checkoutEnabled = Boolean(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY &&
    !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.includes("REPLACE"),
);

export type Tier = "free" | "pro" | "business";

export type BillingInterval = "month" | "year";

/**
 * Pro card lead copy. Monday MRR email digest is intentionally omitted:
 * addon/src/lib/emailDigest.ts needs script.send_mail, which is not in the
 * default appsscript.json oauthScopes (sensitive; opt-in only).
 */
export const pricing = {
  free: {
    tier: "free" as const,
    name: "Free",
    monthly: 0,
    annual: 0,
    sources: 1,
    refresh: "Manual (one click)",
    stores: 1,
    features: [
      "1 source",
      "Manual (one click) refresh",
      "Full history backfill",
      "MRR dashboard tab",
      "Help docs and support form",
    ],
  },
  pro: {
    tier: "pro" as const,
    name: "Pro",
    monthly: 9,
    /** Annual = 10× monthly (2 months free). Catalog only; UI is monthly. */
    annual: 90,
    sources: 4,
    refresh: "Hourly, every 6 hours, daily or weekly",
    stores: 1,
    lead: "One MRR number across every store, refreshed while you sleep.",
    features: [
      "All four sources plus CSV import",
      "Revenue by product and source",
      "Full history backfill",
      "MRR, churn, revenue by product",
      "Help docs and support form",
    ],
  },
  business: {
    tier: "business" as const,
    name: "Business",
    monthly: 19,
    annual: 190,
    sources: 4,
    /** Same allowSchedule / cadence options as Pro (hourly, 6h, daily, weekly). */
    refresh: "Hourly, every 6 hours, daily or weekly",
    stores: 20,
    features: [
      "Everything in Pro",
      "Up to 20 stores per source, one combined MRR",
      "Help docs and support form",
    ],
  },
} as const;

export function tierLimits(tier: Tier) {
  switch (tier) {
    case "business":
      return {
        maxSources: 4,
        maxStores: 20,
        scheduledRefresh: true,
      };
    case "pro":
      return {
        maxSources: 4,
        maxStores: 1,
        scheduledRefresh: true,
      };
    default:
      return {
        maxSources: 1,
        maxStores: 1,
        scheduledRefresh: false,
      };
  }
}
