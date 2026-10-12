import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EXAMPLE_ORDER_SPECS, HERO_ORDERS, SAMPLE_ORDERS } from "@/lib/sample-data";

describe("hero demo MOTION.md sequence", () => {
  const src = readFileSync("components/HeroDemo.tsx", "utf8");

  it("seeds from shared sample orders and starts MRR at 4180", () => {
    expect(src).toMatch(/const BASE_MRR = 4180/);
    expect(src).toMatch(/const START_MRR = BASE_MRR/);
    expect(src).toMatch(/HERO_ORDERS/);
    expect(src).toMatch(/SHARED_HERO_ROWS/);
    expect(HERO_ORDERS).toHaveLength(9);
    expect(HERO_ORDERS[0]?.id).toBe("EX-10457");
    expect(SAMPLE_ORDERS[1]?.id).toBe("EX-10457");
    expect(HERO_ORDERS[0]?.product).toBe(EXAMPLE_ORDER_SPECS[0]?.product);
    expect(HERO_ORDERS[0]?.amount).toBe(SAMPLE_ORDERS[1]?.amount);
  });

  it("adds each landed order amount once (not ×4) and caps near +6%", () => {
    expect(src).toMatch(/tickMrr\(mrrRef\.current \+ amount/);
    expect(src).not.toMatch(/amount \* 4/);
    expect(src).toMatch(/MAX_DELTA = 0\.06/);
    expect(src).toMatch(/LANDING_SPECS/);
    const landBlock = src.slice(
      src.indexOf("LANDING_SPECS: OrderSpec[]"),
      src.indexOf("LANDING_TOTAL"),
    );
    expect((landBlock.match(/amount:/g) || []).length).toBe(14);
  });
});
