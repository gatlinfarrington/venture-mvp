import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DASHBOARD,
  ORDER_HEADERS,
  SAMPLE_ORDERS,
  SAMPLE_SUBS,
  SAMPLE_TAB_NAMES,
  SUB_HEADERS,
} from "@/lib/sample-data";

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

  it("Dashboard KPIs match the example stack and orders totals", () => {
    const paidNet = SAMPLE_ORDERS.filter((o) => o.status === "paid").reduce(
      (sum, o) => sum + o.amount,
      0,
    );
    const active = SAMPLE_SUBS.filter((s) => s.status === "active").length;
    const count = (src: string) => SAMPLE_ORDERS.filter((o) => o.source === src).length;
    expect(DASHBOARD.mrr).toBe("$11.7k");
    expect(DASHBOARD.mrrDelta).toBe("▲ 1.7% MoM");
    expect(DASHBOARD.netRevenue).toBe(`$${paidNet.toLocaleString("en-US")}`);
    expect(DASHBOARD.netDelta).toMatch(/excerpt/i);
    expect(DASHBOARD.activeSubs).toBe(String(active));
    expect(DASHBOARD.activeDelta).toBe(`of ${SAMPLE_SUBS.length} in excerpt`);
    expect(DASHBOARD.churn).toBe("1.9%");
    expect(DASHBOARD.pastDueLine).toMatch(/^Past due \d+/);
    expect(DASHBOARD.sources.find((s) => s.name === "Polar")?.detail).toBe(
      `${count("Polar")} in excerpt`,
    );
    expect(DASHBOARD.sources.find((s) => s.name === "Lemon Squeezy")?.detail).toBe(
      `${count("Lemon Squeezy")} in excerpt`,
    );
    expect(DASHBOARD.sources.find((s) => s.name === "Gumroad")?.detail).toBe(
      `${count("Gumroad")} in excerpt`,
    );
    expect(DASHBOARD.sources.find((s) => s.name === "Stripe")?.detail).toBe(
      `${count("Stripe")} in excerpt`,
    );
    expect(DASHBOARD.sources.find((s) => s.name === "Stripe")?.state).toBe("Synced");
  });

  it("sample caption is buyer-facing with a realistic example.com address", async () => {
    const { SAMPLE_CAPTION, SAMPLE_ORDERS_CAPTION, SAMPLE_SUBS_CAPTION } = await import(
      "@/lib/sample-data"
    );
    expect(SAMPLE_CAPTION).toMatch(/Example data/i);
    expect(SAMPLE_CAPTION).toContain("alex@example.com");
    expect(SAMPLE_CAPTION).not.toMatch(/customer###/);
    expect(SAMPLE_CAPTION).not.toMatch(/Marketplace screenshots/i);
    expect(SAMPLE_ORDERS_CAPTION).toMatch(/Excerpt/i);
    expect(SAMPLE_SUBS_CAPTION).toMatch(/Excerpt/i);
  });

  it("canceled subscriptions never have created dates after cancel", () => {
    for (const s of SAMPLE_SUBS) {
      if (!s.cancelled) continue;
      expect(s.created <= s.cancelled).toBe(true);
    }
  });

  it("orders are one ORDERS continuum shared with the hero final state", async () => {
    const { ORDERS, HERO_FINAL, HERO_LANDINGS } = await import("@/lib/sample-data");
    expect(SAMPLE_ORDERS).toBe(ORDERS);
    expect(SAMPLE_ORDERS).toHaveLength(24);
    expect(SAMPLE_ORDERS[0]?.id).toBe("EX-10470");
    expect(HERO_FINAL[0]?.id).toBe(SAMPLE_ORDERS[0]?.id);
    expect(HERO_FINAL[0]?.amount).toBe(SAMPLE_ORDERS[0]?.amount);
    expect(HERO_LANDINGS[0]?.id).toBe("EX-10457");
    expect(SAMPLE_ORDERS[13]?.id).toBe("EX-10457");
  });

  it("subscriptions start at EXS-2241 with 20+ rows", () => {
    expect(SAMPLE_SUBS[0]?.id).toBe("EXS-2241");
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
    expect(readFileSync(join(root, "lib/sample-data.ts"), "utf8")).toContain("EX-10457");
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
