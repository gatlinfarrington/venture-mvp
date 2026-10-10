import { afterEach, describe, expect, it } from "vitest";
import { brand, installUrl, siteHostname, siteUrl } from "@/lib/brand";
import { siteConfig } from "@/lib/site";

describe("brand config", () => {
  const prevSite = process.env.NEXT_PUBLIC_SITE_URL;
  const prevVercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;

  afterEach(() => {
    if (prevSite === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = prevSite;
    if (prevVercel === undefined) delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    else process.env.VERCEL_PROJECT_PRODUCTION_URL = prevVercel;
  });

  it("keeps a single swappable name wired through siteConfig", () => {
    expect(siteConfig.name).toBe(brand.name);
    expect(brand.name).toBe("RevenueSheet");
    expect(brand.logo.concept).toBe("Ledger Cell");
    expect(brand.logo.mark).toContain("logo-mark");
  });

  it("prefers NEXT_PUBLIC_SITE_URL for canonical origin", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.test/";
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    expect(siteUrl()).toBe("https://example.test");
    expect(siteHostname()).toBe("example.test");
    expect(siteConfig.url).toBe("https://example.test");
    expect(siteConfig.domain).toBe("example.test");
  });

  it("falls back to VERCEL_PROJECT_PRODUCTION_URL when site URL unset", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "venture-mvp.vercel.app";
    expect(siteUrl()).toBe("https://venture-mvp.vercel.app");
    expect(siteHostname()).toBe("venture-mvp.vercel.app");
  });

  it("never hardcodes revenuesheet.app", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    expect(siteUrl()).not.toContain("revenuesheet.app");
    expect(siteHostname()).not.toBe("revenuesheet.app");
  });

  it("returns null install URL when marketplace unset", () => {
    const prevM = process.env.NEXT_PUBLIC_MARKETPLACE_URL;
    const prevI = process.env.NEXT_PUBLIC_INSTALL_URL;
    delete process.env.NEXT_PUBLIC_MARKETPLACE_URL;
    delete process.env.NEXT_PUBLIC_INSTALL_URL;
    expect(installUrl()).toBeNull();
    if (prevM === undefined) delete process.env.NEXT_PUBLIC_MARKETPLACE_URL;
    else process.env.NEXT_PUBLIC_MARKETPLACE_URL = prevM;
    if (prevI === undefined) delete process.env.NEXT_PUBLIC_INSTALL_URL;
    else process.env.NEXT_PUBLIC_INSTALL_URL = prevI;
  });

  it("keeps the Sheets add-on eyebrow without forcing Stripe into the lede", () => {
    expect(brand.taglineShort).toMatch(/^Google Sheets add-on$/i);
    expect(brand.description).toMatch(/Lemon Squeezy, Polar and Gumroad/);
    expect(brand.description).not.toMatch(/Stripe/);
  });
});
