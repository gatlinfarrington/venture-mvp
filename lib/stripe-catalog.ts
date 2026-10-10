import type Stripe from "stripe";
import { pricing, type BillingInterval, type Tier } from "@/lib/site";

export type PaidTier = Exclude<Tier, "free">;

/** Stable lookup_keys — go-live only needs Stripe secret + publishable keys. */
export const PRICE_LOOKUP_KEYS = {
  pro: {
    month: "revenuesheet_pro_monthly",
    year: "revenuesheet_pro_annual",
  },
  business: {
    month: "revenuesheet_business_monthly",
    year: "revenuesheet_business_annual",
  },
} as const;

export const PRODUCT_LOOKUP = {
  pro: {
    name: "RevenueSheet Pro",
    description: "Lemon Squeezy, Polar, Gumroad, Stripe + CSV; scheduled refresh; MRR dashboard.",
  },
  business: {
    name: "RevenueSheet Business",
    description: "Everything in Pro plus multiple stores and priority sync.",
  },
} as const;

export function envPriceId(tier: PaidTier, interval: BillingInterval): string | null {
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
  if (!id || id.includes("REPLACE")) return null;
  return id;
}

export function unitAmountCents(tier: PaidTier, interval: BillingInterval): number {
  const plan = pricing[tier];
  return interval === "month" ? plan.monthly * 100 : plan.annual * 100;
}

export function lookupKeyFor(tier: PaidTier, interval: BillingInterval): string {
  return PRICE_LOOKUP_KEYS[tier][interval];
}

export function tierIntervalFromLookupKey(
  lookupKey: string | null | undefined,
): { tier: PaidTier; interval: BillingInterval } | null {
  if (!lookupKey) return null;
  for (const tier of ["pro", "business"] as const) {
    for (const interval of ["month", "year"] as const) {
      if (PRICE_LOOKUP_KEYS[tier][interval] === lookupKey) {
        return { tier, interval };
      }
    }
  }
  return null;
}

export async function findOrCreatePrice(
  stripe: Stripe,
  tier: PaidTier,
  interval: BillingInterval,
): Promise<string> {
  const fromEnv = envPriceId(tier, interval);
  if (fromEnv) return fromEnv;

  const lookup_key = lookupKeyFor(tier, interval);
  const existing = await stripe.prices.list({ lookup_keys: [lookup_key], limit: 1, active: true });
  if (existing.data[0]?.id) return existing.data[0].id;

  const product = await findOrCreateProduct(stripe, tier);
  const price = await stripe.prices.create({
    product: product.id,
    currency: "usd",
    unit_amount: unitAmountCents(tier, interval),
    recurring: { interval },
    lookup_key,
    transfer_lookup_key: true,
    metadata: { tier, interval, product: "revenuesheet" },
  });
  return price.id;
}

async function findOrCreateProduct(stripe: Stripe, tier: PaidTier): Promise<Stripe.Product> {
  const metaKey = `revenuesheet_${tier}`;
  const listed = await stripe.products.list({ limit: 100, active: true });
  const found = listed.data.find(
    (p) => p.metadata?.revenuesheet_product === metaKey || p.name === PRODUCT_LOOKUP[tier].name,
  );
  if (found) return found;

  return stripe.products.create({
    name: PRODUCT_LOOKUP[tier].name,
    description: PRODUCT_LOOKUP[tier].description,
    metadata: { revenuesheet_product: metaKey },
  });
}
