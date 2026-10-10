import Stripe from "stripe";
import type { BillingInterval, Tier } from "@/lib/site";
import {
  envPriceId,
  findOrCreatePrice,
  tierIntervalFromLookupKey,
  type PaidTier,
} from "@/lib/stripe-catalog";

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.includes("REPLACE_ME")) {
    throw new Error(
      "STRIPE_SECRET_KEY is not configured. Set a Stripe secret key in Vercel env.",
    );
  }
  return new Stripe(key, {
    apiVersion: "2026-09-30.endive",
    typescript: true,
  });
}

/** Resolve a price id: prefer env, else Stripe lookup_key (create if missing). */
export async function priceIdFor(
  tier: PaidTier,
  interval: BillingInterval,
): Promise<string> {
  const stripe = getStripe();
  return findOrCreatePrice(stripe, tier, interval);
}

export async function tierFromPriceId(
  priceId: string,
): Promise<Exclude<Tier, "free"> | null> {
  const fromEnv = envTierFromPriceId(priceId);
  if (fromEnv) return fromEnv;

  try {
    const stripe = getStripe();
    const price = await stripe.prices.retrieve(priceId);
    const fromLookup = tierIntervalFromLookupKey(price.lookup_key);
    if (fromLookup) return fromLookup.tier;
    const metaTier = price.metadata?.tier;
    if (metaTier === "pro" || metaTier === "business") return metaTier;
  } catch {
    return null;
  }
  return null;
}

export async function intervalFromPriceId(priceId: string): Promise<BillingInterval> {
  const annualEnv = [
    process.env.STRIPE_PRICE_PRO_ANNUAL,
    process.env.STRIPE_PRICE_BUSINESS_ANNUAL,
  ];
  if (annualEnv.includes(priceId)) return "year";

  const monthlyEnv = [
    process.env.STRIPE_PRICE_PRO_MONTHLY,
    process.env.STRIPE_PRICE_BUSINESS_MONTHLY,
  ];
  if (monthlyEnv.includes(priceId)) return "month";

  try {
    const stripe = getStripe();
    const price = await stripe.prices.retrieve(priceId);
    const fromLookup = tierIntervalFromLookupKey(price.lookup_key);
    if (fromLookup) return fromLookup.interval;
    if (price.metadata?.interval === "year" || price.metadata?.interval === "month") {
      return price.metadata.interval;
    }
    if (price.recurring?.interval === "year") return "year";
  } catch {
    /* fall through */
  }
  return "month";
}

function envTierFromPriceId(priceId: string): PaidTier | null {
  const pairs: Array<[string | null, PaidTier]> = [
    [envPriceId("pro", "month"), "pro"],
    [envPriceId("pro", "year"), "pro"],
    [envPriceId("business", "month"), "business"],
    [envPriceId("business", "year"), "business"],
  ];
  for (const [id, tier] of pairs) {
    if (id && id === priceId) return tier;
  }
  return null;
}
