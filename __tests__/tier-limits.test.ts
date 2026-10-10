import { describe, expect, it } from "vitest";
import { pricing, tierLimits } from "@/lib/site";

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
      maxSources: 3,
      maxStores: 1,
      scheduledRefresh: true,
    });
  });

  it("business allows multiple stores", () => {
    expect(tierLimits("business").maxStores).toBeGreaterThan(1);
    expect(tierLimits("business").scheduledRefresh).toBe(true);
  });
});

describe("pricing", () => {
  it("annual plans equal ten months (two months free)", () => {
    expect(pricing.pro.annual).toBe(pricing.pro.monthly * 10);
    expect(pricing.business.annual).toBe(pricing.business.monthly * 10);
  });
});
