import Stripe from "stripe";
import type { BillingInterval, Tier } from "@/lib/site";

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.includes("REPLACE_ME")) {
    throw new Error(
      "STRIPE_SECRET_KEY is not configured. Set a Stripe test secret key.",
    );
  }
  return new Stripe(key, {
    apiVersion: "2026-09-30.endive",
    typescript: true,
  });
}

export function priceIdFor(
  tier: Exclude<Tier, "free">,
  interval: BillingInterval,
): string {
  const map = {
    pro: {
      month: process.env.STRIPE_PRICE_PRO_MONTHLY,
      year: process.env.STRIPE_PRICE_PRO_ANNUAL,
    },
    business: {
      month: process.env.STRIPE_PRICE_BUSINESS_MONTHLY,
      year: process.env.STRIPE_PRICE_BUSINESS_ANNUAL,
    },
  } as const;

  const id = map[tier][interval];
  if (!id || id.includes("REPLACE")) {
    throw new Error(`Missing Stripe price ID for ${tier}/${interval}`);
  }
  return id;
}

export function tierFromPriceId(priceId: string): Exclude<Tier, "free"> | null {
  const pairs: Array<[string | undefined, Exclude<Tier, "free">]> = [
    [process.env.STRIPE_PRICE_PRO_MONTHLY, "pro"],
    [process.env.STRIPE_PRICE_PRO_ANNUAL, "pro"],
    [process.env.STRIPE_PRICE_BUSINESS_MONTHLY, "business"],
    [process.env.STRIPE_PRICE_BUSINESS_ANNUAL, "business"],
  ];
  for (const [id, tier] of pairs) {
    if (id && id === priceId) return tier;
  }
  return null;
}

export function intervalFromPriceId(priceId: string): BillingInterval {
  const annual = [
    process.env.STRIPE_PRICE_PRO_ANNUAL,
    process.env.STRIPE_PRICE_BUSINESS_ANNUAL,
  ];
  return annual.includes(priceId) ? "year" : "month";
}
