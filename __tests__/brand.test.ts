import { describe, expect, it } from "vitest";
import { brand } from "@/lib/brand";
import { siteConfig } from "@/lib/site";

describe("brand config", () => {
  it("keeps a single swappable name wired through siteConfig", () => {
    expect(siteConfig.name).toBe(brand.name);
    expect(brand.name).toBe("RevenueSheet");
    expect(brand.logo.concept).toBe("Ledger Cell");
    expect(brand.logo.mark).toContain("logo-mark");
  });

  it("exposes a domain for metadata and OG", () => {
    expect(brand.domain).toMatch(/\./);
  });
});
