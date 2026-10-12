import { afterEach, describe, expect, it } from "vitest";
import { brand, installUrl, siteHostname, siteUrl } from "@/lib/brand";
import { siteConfig } from "@/lib/site";

describe("brand config", () => {
  const prevSite = process.env.NEXT_PUBLIC_SITE_URL;
  const prevVercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const prevVercelEnv = process.env.VERCEL_ENV;

  afterEach(() => {
    if (prevSite === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = prevSite;
    if (prevVercel === undefined) delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    else process.env.VERCEL_PROJECT_PRODUCTION_URL = prevVercel;
    if (prevVercelEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercelEnv;
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

  it("domain swap is one env var — siteConfig.url tracks NEXT_PUBLIC_SITE_URL", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://custom.example";
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    // Canonical, sitemap, robots, checkout, and launch emails all read siteConfig.url / siteUrl().
    expect(siteConfig.url).toBe("https://custom.example");
    expect(siteUrl()).toBe(siteConfig.url);
  });

  it("falls back to VERCEL_PROJECT_PRODUCTION_URL outside production", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.VERCEL_ENV;
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "venture-mvp.vercel.app";
    // Vitest NODE_ENV is "test", so preview/dev still use the Vercel host.
    expect(siteUrl()).toBe("https://venture-mvp.vercel.app");
    expect(siteHostname()).toBe("venture-mvp.vercel.app");
  });

  it("uses www.revenuesheet.app as production canonical (not *.vercel.app)", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.VERCEL_ENV = "production";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "venture-mvp.vercel.app";
    expect(siteUrl()).toBe("https://www.revenuesheet.app");
    expect(siteHostname()).toBe("www.revenuesheet.app");
    delete process.env.VERCEL_ENV;
  });

  it("local / test without env does not invent a custom domain", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    delete process.env.VERCEL_ENV;
    expect(siteUrl()).toBe("http://localhost:3000");
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

  it("keeps the Sheets add-on eyebrow and lists four stores in the lede", () => {
    expect(brand.taglineShort).toMatch(/^Google Sheets add-on$/i);
    expect(brand.description).toMatch(
      /Lemon Squeezy, Polar, Gumroad and Stripe revenue, synced into Google Sheets on a schedule/,
    );
  });

  it("lists Stripe and CSV import in the meta / Open Graph description", () => {
    expect(brand.metaDescription).toMatch(/Stripe/);
    expect(brand.metaDescription).toMatch(/CSV import/);
  });
});

