import { describe, expect, it } from "vitest";
import { everyPlanIncludes, pricing, tierLimits } from "@/lib/site";

describe("tierLimits", () => {
  it("free allows one source and manual-only sync", () => {
    expect(tierLimits("free")).toEqual({
      maxSources: 1,
      maxStores: 1,
      scheduledRefresh: false,
    });
  });

  it("pro unlocks all sources with a single store", () => {
    expect(tierLimits("pro")).toEqual({
      maxSources: 4,
      maxStores: 1,
      scheduledRefresh: true,
    });
  });

  it("business allows multiple stores", () => {
    expect(tierLimits("business").maxSources).toBe(4);
    expect(tierLimits("business").maxStores).toBe(20);
    expect(tierLimits("business").scheduledRefresh).toBe(true);
  });
});

describe("pricing", () => {
  it("annual catalog amounts equal ten months of monthly (not advertised on /pricing)", () => {
    expect(pricing.pro.annual).toBe(pricing.pro.monthly * 10);
    expect(pricing.business.annual).toBe(pricing.business.monthly * 10);
  });

  it("advertises store limits that match tierLimits", () => {
    expect(pricing.free.stores).toBe(tierLimits("free").maxStores);
    expect(pricing.pro.stores).toBe(tierLimits("pro").maxStores);
    expect(pricing.business.stores).toBe(tierLimits("business").maxStores);
    expect(pricing.business.features).toContain(
      "Up to 20 stores per source, one combined MRR",
    );
    expect(pricing.pro.features).toContain("All four sources plus CSV import");
    expect(pricing.pro.features).toContain(
      "MRR, churn, and revenue by product and source",
    );
    expect(pricing.pro.features).not.toContain("Revenue by product and source");
  });

  it("Pro and Business share the same refresh cadence copy", () => {
    expect(pricing.pro.refresh).toBe(pricing.business.refresh);
    expect(tierLimits("pro").scheduledRefresh).toBe(true);
    expect(tierLimits("business").scheduledRefresh).toBe(true);
  });

  it("Pro lists the real refresh cadence; Business has a factual lead", () => {
    expect(pricing.pro.features).toContain(pricing.pro.refresh);
    expect(pricing.business.lead).toBe(
      "For sellers running several stores on one platform.",
    );
  });

  it("lists help docs once under every plan, not on each card", () => {
    expect(everyPlanIncludes).toContain("Help docs and support form");
    for (const plan of [pricing.free, pricing.pro, pricing.business]) {
      expect(plan.features).not.toContain("Help docs and support form");
    }
  });

  it("Business lists concrete shipped features (no Everything in Pro)", () => {
    expect(pricing.business.features).toEqual([
      "Up to 20 stores per source, one combined MRR",
      "All four sources plus CSV import",
      "MRR by source",
      "Hourly, every 6 hours, daily or weekly",
    ]);
    expect(pricing.business.features.join(" ")).not.toMatch(/by store/i);
  });
});
