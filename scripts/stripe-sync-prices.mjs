#!/usr/bin/env node
/**
 * One-command Stripe catalog sync.
 * Creates (or reuses) Pro/Business products and prices with stable lookup_keys.
 * Always sets product tax_code (Stripe Managed Payments).
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_… npm run stripe:sync-prices
 */
import Stripe from "stripe";

const KEY = process.env.STRIPE_SECRET_KEY;
if (!KEY || KEY.includes("REPLACE")) {
  console.error("Set STRIPE_SECRET_KEY to a real sk_test_ or sk_live_ key.");
  process.exit(1);
}

const stripe = new Stripe(KEY, { apiVersion: "2026-09-30.endive" });

/** Must match STRIPE_PRODUCT_TAX_CODE in lib/stripe-catalog.ts */
const PRODUCT_TAX_CODE = "txcd_10103001";

const catalog = [
  {
    tier: "pro",
    productName: "RevenueSheet Pro",
    description: "All four sources plus CSV import, scheduled refresh, MRR dashboard.",
    prices: [
      { interval: "month", amount: 900, lookup_key: "revenuesheet_pro_monthly" },
      { interval: "year", amount: 9000, lookup_key: "revenuesheet_pro_annual" },
    ],
  },
  {
    tier: "business",
    productName: "RevenueSheet Business",
    description:
      "Everything in Pro, plus up to 20 stores per source with one combined MRR. Same scheduled refresh as Pro.",
    prices: [
      { interval: "month", amount: 1900, lookup_key: "revenuesheet_business_monthly" },
      { interval: "year", amount: 19000, lookup_key: "revenuesheet_business_annual" },
    ],
  },
];

function hasTaxCode(product) {
  const raw = product.tax_code;
  if (!raw) return false;
  if (typeof raw === "string") return raw === PRODUCT_TAX_CODE;
  return raw.id === PRODUCT_TAX_CODE;
}

async function ensureProduct(entry) {
  const metaKey = `revenuesheet_${entry.tier}`;
  const listed = await stripe.products.list({ limit: 100, active: true });
  const found = listed.data.find(
    (p) => p.metadata?.revenuesheet_product === metaKey || p.name === entry.productName,
  );
  if (found) {
    if (!hasTaxCode(found)) {
      const updated = await stripe.products.update(found.id, { tax_code: PRODUCT_TAX_CODE });
      console.log(`product tax ${updated.id}  ${updated.name}  tax_code=${PRODUCT_TAX_CODE}`);
      return updated;
    }
    console.log(`product ok  ${found.id}  ${found.name}`);
    return found;
  }
  const created = await stripe.products.create({
    name: entry.productName,
    description: entry.description,
    tax_code: PRODUCT_TAX_CODE,
    metadata: { revenuesheet_product: metaKey },
  });
  console.log(`product new ${created.id}  ${created.name}  tax_code=${PRODUCT_TAX_CODE}`);
  return created;
}

async function ensurePrice(productId, tier, price) {
  const existing = await stripe.prices.list({
    lookup_keys: [price.lookup_key],
    limit: 1,
    active: true,
  });
  if (existing.data[0]) {
    console.log(`price   ok  ${existing.data[0].id}  ${price.lookup_key}`);
    return existing.data[0];
  }
  const created = await stripe.prices.create({
    product: productId,
    currency: "usd",
    unit_amount: price.amount,
    recurring: { interval: price.interval },
    lookup_key: price.lookup_key,
    transfer_lookup_key: true,
    metadata: { tier, interval: price.interval, product: "revenuesheet" },
  });
  console.log(`price   new ${created.id}  ${price.lookup_key}`);
  return created;
}

const out = {};
for (const entry of catalog) {
  const product = await ensureProduct(entry);
  for (const price of entry.prices) {
    const p = await ensurePrice(product.id, entry.tier, price);
    out[price.lookup_key] = p.id;
  }
}

console.log("\nOptional Vercel env (not required when using lookup_keys):\n");
console.log(`STRIPE_PRICE_PRO_MONTHLY=${out.revenuesheet_pro_monthly}`);
console.log(`STRIPE_PRICE_PRO_ANNUAL=${out.revenuesheet_pro_annual}`);
console.log(`STRIPE_PRICE_BUSINESS_MONTHLY=${out.revenuesheet_business_monthly}`);
console.log(`STRIPE_PRICE_BUSINESS_ANNUAL=${out.revenuesheet_business_annual}`);
