import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const files = [
  "components/LandingSections.tsx",
  "components/Pricing.tsx",
  "app/docs/faq/page.tsx",
  "app/privacy/page.tsx",
  "app/security/page.tsx",
  "app/terms/page.tsx",
  "lib/seo-pages.ts",
];

const REQUIRED_SCOPES = [
  "drive.file",
  "spreadsheets.currentonly",
  "script.external_request",
  "script.scriptapp",
  "script.container.ui",
] as const;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(tsx|ts|mdx|md)$/.test(name)) out.push(full);
  }
  return out;
}

describe("OAuth scope copy", () => {
  it("does not claim broad Drive access is required", () => {
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      expect(text).not.toMatch(/related Drive file access/i);
      expect(text).not.toMatch(/Drive file access required/i);
      // May mention drive.readonly only as something we do not request.
      expect(text).not.toMatch(/requires?\s+drive\.readonly/i);
      expect(text).not.toMatch(/auth\/drive["'`\s]/i);
    }
    const landing = readFileSync("components/LandingSections.tsx", "utf8");
    const faq = readFileSync("app/docs/faq/page.tsx", "utf8");
    const privacy = readFileSync("app/privacy/page.tsx", "utf8");
    const terms = readFileSync("app/terms/page.tsx", "utf8");
    for (const text of [landing, faq, privacy, terms]) {
      expect(text).toMatch(/spreadsheets\.currentonly|current spreadsheet/i);
      expect(text).toMatch(/external_request|outbound HTTPS/i);
    }
  });

  it("names every published scope in privacy and security", () => {
    const privacy = readFileSync("app/privacy/page.tsx", "utf8");
    const security = readFileSync("app/security/page.tsx", "utf8");
    for (const text of [privacy, security]) {
      for (const scope of REQUIRED_SCOPES) {
        expect(text).toContain(scope);
      }
      expect(text).toMatch(/not broad Drive|broad Google Drive|broad Drive/i);
      expect(text).not.toContain("script.send_mail");
    }
    expect(security).toMatch(/User Properties|getUserProperties/i);
    expect(security).toMatch(/license verify|\/api\/license\/verify/i);
    expect(security).toContain("Vercel");
    expect(security).toContain("Upstash");
    expect(security).toContain("Stripe");
    expect(security).toMatch(/do not claim SOC|No SOC\s*2/i);
    expect(security).not.toMatch(/\bSOC\s*2 Type II certified\b/i);
  });
});

describe("copy accuracy", () => {
  it("does not claim customer dedupe across stores", () => {
    const roots = ["app", "components", "lib", "content"];
    const blob = roots
      .flatMap((dir) => walk(dir))
      .map((f) => readFileSync(f, "utf8"))
      .join("\n");
    expect(blob).not.toMatch(/deduped across stores/i);
    expect(blob).not.toMatch(/dedupe(?:d)? (?:buyers|customers) across/i);
  });

  it("does not mark pricing as estimated", () => {
    const pricing = readFileSync("components/Pricing.tsx", "utf8");
    const page = readFileSync("app/pricing/page.tsx", "utf8");
    const og = readFileSync("app/pricing/opengraph-image.tsx", "utf8");
    for (const text of [pricing, page, og]) {
      expect(text).not.toMatch(/\(est\.\)/);
      expect(text).not.toMatch(/marked \(est\.\)/i);
    }
  });
});
