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
 * Explicit launch gate. Must be the string "true" to sell paid plans.
 * Stripe keys alone are not enough — prevents accidental live Checkout.
 */
export const checkoutOpen = process.env.CHECKOUT_OPEN === "true";

/**
 * Paid Checkout UI is on when CHECKOUT_OPEN=true and a real Stripe publishable key is set.
 * The Checkout API uses STRIPE_SECRET_KEY and resolves/creates prices server-side.
 */
export const checkoutEnabled = Boolean(
  checkoutOpen &&
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY &&
    !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.includes("REPLACE"),
);

/** Buyer-facing line when Checkout is gated closed. */
export const CHECKOUT_CLOSED_MESSAGE =
  "Paid plans open with the Marketplace listing. Join the launch list for updates.";

export type Tier = "free" | "pro" | "business";

export type BillingInterval = "month" | "year";

/**
 * Pro card lead copy. Monday MRR email digest is intentionally omitted:
 * addon/src/lib/emailDigest.ts needs script.send_mail, which is not in the
 * default appsscript.json oauthScopes (sensitive; opt-in only).
 */
/** Shared across Free / Pro / Business — shown once under the cards, not on each card. */
export const everyPlanIncludes = ["Help docs and support form"] as const;

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
    ],
  },
  pro: {
    tier: "pro" as const,
    name: "Pro",
    monthly: 9,
    /** Stripe catalog amount (10× monthly). Not shown on /pricing; UI is monthly only. */
    annual: 90,
    sources: 4,
    refresh: "Hourly, every 6 hours, daily or weekly",
    stores: 1,
    lead: "One MRR number across every store, refreshed while you sleep.",
    features: [
      "All four sources plus CSV import",
      "Hourly, every 6 hours, daily or weekly",
      "Full history backfill",
      "MRR, churn, and revenue by product and source",
    ],
  },
  business: {
    tier: "business" as const,
    name: "Business",
    monthly: 19,
    /** Stripe catalog amount (10× monthly). Not shown on /pricing; UI is monthly only. */
    annual: 190,
    sources: 4,
    /** Same allowSchedule / cadence options as Pro (hourly, 6h, daily, weekly). */
    refresh: "Hourly, every 6 hours, daily or weekly",
    stores: 20,
    lead: "For sellers running several stores on one platform.",
    features: [
      "All four sources plus CSV import",
      "Up to 20 stores per source, one combined MRR",
      "MRR by source",
      "Hourly, every 6 hours, daily or weekly",
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
