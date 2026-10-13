import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DASHBOARD,
  HERO_FINAL,
  HERO_LANDINGS,
  ORDER_HEADERS,
  ORDERS,
  SAMPLE_HEADLINE,
  SAMPLE_MRR_OCT,
  SAMPLE_ORDERS,
  SAMPLE_SUBS,
  SAMPLE_TAB_NAMES,
  SUB_HEADERS,
} from "@/lib/sample-data";

const TODAY = "2026-10-12";

describe("/sample acceptance data", () => {
  it("tab names match the add-on sheet names", () => {
    expect([...SAMPLE_TAB_NAMES]).toEqual(["Dashboard", "Orders", "Subscriptions"]);
  });

  it("Orders headers match the sample template (no Store column)", () => {
    expect([...ORDER_HEADERS]).toEqual([
      "Order ID",
      "Created",
      "Source",
      "Product",
      "Customer email",
      "Amount (USD)",
      "Status",
      "Country",
    ]);
  });

  it("Subscriptions headers match the sample template (no Store column)", () => {
    expect([...SUB_HEADERS]).toEqual([
      "Subscription ID",
      "Created",
      "Source",
      "Product",
      "Customer email",
      "MRR (USD)",
      "Status",
      "Cancelled",
      "Interval",
      "Country",
    ]);
  });

  it("sample-dataset.json sha256 matches the design pin", () => {
    const buf = readFileSync(join(process.cwd(), "lib/sample-dataset/sample-dataset.json"));
    expect(createHash("sha256").update(buf).digest("hex")).toBe(
      "ce5222c996696b35a013b7e184d0dd801e0f37c320cb4369f70cbb9b91760426",
    );
  });

  it("uses short product names (no Example Course Membership)", () => {
    for (const o of ORDERS) {
      expect(o.product).not.toMatch(/Example Course Membership/i);
      expect(o.product.length).toBeLessThanOrEqual(14);
    }
    for (const s of SAMPLE_SUBS) {
      expect(s.product).not.toMatch(/Example Course Membership/i);
      expect(s.product.length).toBeLessThanOrEqual(14);
    }
  });

  it("Dashboard KPIs match the reconciled headline (not the excerpt)", () => {
    expect(DASHBOARD.mrr).toBe("$4,516");
    expect(DASHBOARD.mrrDelta).toBe("▲ 4.5% MoM");
    expect(DASHBOARD.netRevenue).toBe("$6,658");
    expect(DASHBOARD.netDelta).toBe("30D net · 261 orders across sources");
    expect(DASHBOARD.activeSubs).toBe(String(SAMPLE_HEADLINE.activeSubs));
    expect(DASHBOARD.activeSubs).toBe("233");
    expect(DASHBOARD.churn).toBe("2.2%");
    expect(DASHBOARD.pastDueLine).toBe(
      "Past due 5 · $95 · MRR counts active subscriptions only",
    );
    expect(DASHBOARD.sources.find((s) => s.name === "Polar")?.detail).toBe("94 orders · 30D");
    expect(DASHBOARD.sources.find((s) => s.name === "Lemon Squeezy")?.detail).toBe(
      "71 orders · 30D",
    );
    expect(DASHBOARD.sources.find((s) => s.name === "Gumroad")?.detail).toBe("38 orders · 30D");
    expect(DASHBOARD.sources.find((s) => s.name === "Stripe")?.detail).toBe("58 orders · 30D");
    expect(DASHBOARD.sources.find((s) => s.name === "Stripe")?.state).toBe("Synced");
    expect(SAMPLE_MRR_OCT).toBe(4516);
  });

  it("sample caption is buyer-facing with a realistic example.com address", async () => {
    const { SAMPLE_CAPTION, SAMPLE_ORDERS_CAPTION, SAMPLE_SUBS_CAPTION } = await import(
      "@/lib/sample-data"
    );
    expect(SAMPLE_CAPTION).toMatch(/Example data/i);
    expect(SAMPLE_CAPTION).toContain("alex@example.com");
    expect(SAMPLE_CAPTION).not.toMatch(/customer###/);
    expect(SAMPLE_CAPTION).not.toMatch(/Marketplace screenshots/i);
    expect(SAMPLE_ORDERS_CAPTION).toMatch(/Excerpt: 24 of 261 orders \(30D\)/);
    expect(SAMPLE_SUBS_CAPTION).toMatch(/Excerpt: 24 example subscriptions/);
  });

  it("canceled subscriptions never have created dates after cancel", () => {
    for (const s of SAMPLE_SUBS) {
      if (!s.cancelled) continue;
      expect(s.created <= s.cancelled).toBe(true);
    }
  });

  it("no sample dates are in the future", () => {
    for (const o of ORDERS) {
      expect(o.created.slice(0, 10) <= TODAY).toBe(true);
    }
    for (const s of SAMPLE_SUBS) {
      expect(s.created <= TODAY).toBe(true);
      if (s.cancelled) expect(s.cancelled <= TODAY).toBe(true);
    }
  });

  it("orders are one ORDERS continuum shared with the hero final state", () => {
    expect(SAMPLE_ORDERS).toEqual(ORDERS.slice(0, 24));
    expect(SAMPLE_ORDERS).toHaveLength(24);
    expect(SAMPLE_ORDERS[0]?.id).toBe("EX-10261");
    expect(HERO_FINAL[0]?.id).toBe(SAMPLE_ORDERS[0]?.id);
    expect(HERO_FINAL[0]?.amount).toBe(SAMPLE_ORDERS[0]?.amount);
    expect(HERO_LANDINGS[0]?.id).toBe("EX-10248");
    expect(HERO_FINAL.map((o) => o.id)).toEqual(SAMPLE_ORDERS.slice(0, 9).map((o) => o.id));
  });

  it("subscriptions excerpt starts at newest EXS id with 20+ rows", () => {
    expect(SAMPLE_SUBS[0]?.id.startsWith("EXS-")).toBe(true);
    expect(SAMPLE_SUBS.length).toBeGreaterThanOrEqual(20);
  });

  it("every email ends in @example.com", () => {
    for (const o of SAMPLE_ORDERS) expect(o.email.endsWith("@example.com")).toBe(true);
    for (const s of SAMPLE_SUBS) expect(s.email.endsWith("@example.com")).toBe(true);
  });

  it("sample page and sheet files exist with the expected names", () => {
    const root = process.cwd();
    expect(readFileSync(join(root, "app/sample/page.tsx"), "utf8")).toContain(
      "The sheet you get, filled in.",
    );
    expect(readFileSync(join(root, "components/SampleSheet.tsx"), "utf8")).toContain(
      "Sheet tabs",
    );
    expect(readFileSync(join(root, "lib/sample-dataset/sample-dataset.json"), "utf8")).toContain(
      "EX-10261",
    );
  });

  it("copy has no em dashes", () => {
    const root = process.cwd();
    for (const rel of [
      "app/sample/page.tsx",
      "components/SampleSheet.tsx",
      "components/SampleCopyAction.tsx",
      "lib/sample-data.ts",
    ]) {
      const text = readFileSync(join(root, rel), "utf8");
      expect(text.includes("\u2014")).toBe(false);
    }
  });
});
