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

/** Paid Checkout is off until a real Stripe publishable key is set. */
export const checkoutEnabled = Boolean(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY &&
    !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.includes("REPLACE"),
);

export type Tier = "free" | "pro" | "business";

export type BillingInterval = "month" | "year";

export const pricing = {
  free: {
    tier: "free" as const,
    name: "Free",
    monthly: 0,
    annual: 0,
    sources: 1,
    refresh: "Manual",
    stores: 1,
    features: [
      "1 source",
      "Manual refresh",
      "Full history backfill",
      "MRR dashboard tab",
    ],
  },
  pro: {
    tier: "pro" as const,
    name: "Pro",
    monthly: 9,
    /** Annual = 10× monthly (2 months free). */
    annual: 90,
    sources: 4,
    refresh: "Scheduled (hourly)",
    stores: 1,
    features: [
      "All connected sources",
      "Scheduled refresh",
      "Full history backfill",
      "MRR, churn, revenue by product",
    ],
  },
  business: {
    tier: "business" as const,
    name: "Business",
    monthly: 19,
    annual: 190,
    sources: 4,
    refresh: "Scheduled (hourly)",
    stores: "Multiple",
    features: [
      "Everything in Pro",
      "Multiple stores per source",
      "Priority sync queue",
      "Email support",
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
