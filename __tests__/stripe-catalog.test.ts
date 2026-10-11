import { describe, expect, it, vi } from "vitest";
import {
  PRICE_LOOKUP_KEYS,
  STRIPE_PRODUCT_TAX_CODE,
  catalogProductCreateParams,
  ensureProductTaxCode,
  ensureTaxCodeForPrice,
  findOrCreateProduct,
  lookupKeyFor,
  productHasTaxCode,
  tierIntervalFromLookupKey,
  unitAmountCents,
} from "@/lib/stripe-catalog";
import { getStripeEnvReport } from "@/lib/stripe-env";
import type Stripe from "stripe";

describe("stripe catalog", () => {
  it("uses stable lookup keys for all paid prices", () => {
    expect(lookupKeyFor("pro", "month")).toBe(PRICE_LOOKUP_KEYS.pro.month);
    expect(lookupKeyFor("business", "year")).toBe(PRICE_LOOKUP_KEYS.business.year);
    expect(tierIntervalFromLookupKey("revenuesheet_pro_annual")).toEqual({
      tier: "pro",
      interval: "year",
    });
  });

  it("matches pricing table amounts in cents", () => {
    expect(unitAmountCents("pro", "month")).toBe(900);
    expect(unitAmountCents("pro", "year")).toBe(9000);
    expect(unitAmountCents("business", "month")).toBe(1900);
    expect(unitAmountCents("business", "year")).toBe(19000);
  });

  it("reports missing keys as errors when placeholders remain", () => {
    const report = getStripeEnvReport();
    expect(report.issues.some((i) => i.code === "missing_secret" || i.code === "missing_publishable")).toBe(
      true,
    );
  });

  it("sets Managed Payments tax_code on product create params", () => {
    expect(STRIPE_PRODUCT_TAX_CODE).toBe("txcd_10103001");
    const params = catalogProductCreateParams("pro");
    expect(params.tax_code).toBe(STRIPE_PRODUCT_TAX_CODE);
    expect(catalogProductCreateParams("business").tax_code).toBe(STRIPE_PRODUCT_TAX_CODE);
  });

  it("updates existing products that lack a tax_code", async () => {
    const bare = {
      id: "prod_bare",
      name: "RevenueSheet Pro",
      tax_code: null,
      metadata: { revenuesheet_product: "revenuesheet_pro" },
    } as unknown as Stripe.Product;
    const patched = { ...bare, tax_code: STRIPE_PRODUCT_TAX_CODE } as Stripe.Product;

    const update = vi.fn().mockResolvedValue(patched);
    const stripe = {
      products: {
        list: vi.fn().mockResolvedValue({ data: [bare] }),
        create: vi.fn(),
        update,
      },
    } as unknown as Stripe;

    expect(productHasTaxCode(bare)).toBe(false);
    const ensured = await ensureProductTaxCode(stripe, bare);
    expect(update).toHaveBeenCalledWith("prod_bare", { tax_code: STRIPE_PRODUCT_TAX_CODE });
    expect(ensured.tax_code).toBe(STRIPE_PRODUCT_TAX_CODE);

    const found = await findOrCreateProduct(stripe, "pro");
    expect(found.tax_code).toBe(STRIPE_PRODUCT_TAX_CODE);
    expect(stripe.products.create).not.toHaveBeenCalled();
  });

  it("patches tax_code when resolving an existing price for checkout", async () => {
    const bareProduct = {
      id: "prod_live",
      tax_code: null,
      metadata: {},
    } as unknown as Stripe.Product;
    const update = vi.fn().mockResolvedValue({
      ...bareProduct,
      tax_code: STRIPE_PRODUCT_TAX_CODE,
    });
    const stripe = {
      prices: {
        retrieve: vi.fn().mockResolvedValue({
          id: "price_123",
          product: bareProduct,
        }),
      },
      products: { update },
    } as unknown as Stripe;

    await ensureTaxCodeForPrice(stripe, "price_123");
    expect(stripe.prices.retrieve).toHaveBeenCalledWith("price_123", {
      expand: ["product"],
    });
    expect(update).toHaveBeenCalledWith("prod_live", { tax_code: STRIPE_PRODUCT_TAX_CODE });
  });
});
