import type Stripe from "stripe";
import { pricing, type BillingInterval, type Tier } from "@/lib/site";

export type PaidTier = Exclude<Tier, "free">;

/**
 * Stripe Managed Payments requires a product tax code on Checkout line items.
 * Software as a service — https://stripe.com/docs/tax/tax-codes
 */
export const STRIPE_PRODUCT_TAX_CODE = "txcd_10103001" as const;

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
    description:
      "Everything in Pro, plus up to 20 stores per source with one combined MRR. Same scheduled refresh as Pro.",
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

/** Resolve the Product on a Price and set tax_code when missing. */
export async function ensureTaxCodeForPrice(
  stripe: Stripe,
  price: Stripe.Price | string,
): Promise<void> {
  const resolved =
    typeof price === "string"
      ? await stripe.prices.retrieve(price, { expand: ["product"] })
      : price.product && typeof price.product === "object"
        ? price
        : await stripe.prices.retrieve(price.id, { expand: ["product"] });

  const productRef = resolved.product;
  if (!productRef) return;
  const product =
    typeof productRef === "string"
      ? await stripe.products.retrieve(productRef)
      : productRef;
  if ("deleted" in product && product.deleted) return;
  await ensureProductTaxCode(stripe, product as Stripe.Product);
}

export async function findOrCreatePrice(
  stripe: Stripe,
  tier: PaidTier,
  interval: BillingInterval,
): Promise<string> {
  const fromEnv = envPriceId(tier, interval);
  if (fromEnv) {
    await ensureTaxCodeForPrice(stripe, fromEnv);
    return fromEnv;
  }

  const lookup_key = lookupKeyFor(tier, interval);
  const existing = await stripe.prices.list({ lookup_keys: [lookup_key], limit: 1, active: true });
  if (existing.data[0]?.id) {
    await ensureTaxCodeForPrice(stripe, existing.data[0]);
    return existing.data[0].id;
  }

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

export function catalogProductCreateParams(tier: PaidTier): Stripe.ProductCreateParams {
  return {
    name: PRODUCT_LOOKUP[tier].name,
    description: PRODUCT_LOOKUP[tier].description,
    tax_code: STRIPE_PRODUCT_TAX_CODE,
    metadata: { revenuesheet_product: `revenuesheet_${tier}` },
  };
}

/** True when the product already carries the Managed Payments tax code. */
export function productHasTaxCode(
  product: Pick<Stripe.Product, "tax_code">,
  taxCode: string = STRIPE_PRODUCT_TAX_CODE,
): boolean {
  const raw = product.tax_code;
  if (!raw) return false;
  if (typeof raw === "string") return raw === taxCode;
  return raw.id === taxCode;
}

/** Set tax_code on an existing product when missing (idempotent). */
export async function ensureProductTaxCode(
  stripe: Stripe,
  product: Stripe.Product,
): Promise<Stripe.Product> {
  if (productHasTaxCode(product)) return product;
  return stripe.products.update(product.id, { tax_code: STRIPE_PRODUCT_TAX_CODE });
}

export async function findOrCreateProduct(
  stripe: Stripe,
  tier: PaidTier,
): Promise<Stripe.Product> {
  const metaKey = `revenuesheet_${tier}`;
  const listed = await stripe.products.list({ limit: 100, active: true });
  const found = listed.data.find(
    (p) => p.metadata?.revenuesheet_product === metaKey || p.name === PRODUCT_LOOKUP[tier].name,
  );
  if (found) return ensureProductTaxCode(stripe, found);

  return stripe.products.create(catalogProductCreateParams(tier));
}
