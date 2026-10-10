import { describe, expect, it } from "vitest";
import {
  PRICE_LOOKUP_KEYS,
  lookupKeyFor,
  tierIntervalFromLookupKey,
  unitAmountCents,
} from "@/lib/stripe-catalog";
import { getStripeEnvReport } from "@/lib/stripe-env";

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
});
