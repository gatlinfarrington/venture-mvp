import { describe, expect, it } from "vitest";
import {
  BASE_MRR,
  FINAL_ROWS,
  LANDING_SPECS,
  LANDING_TOTAL,
  MAX_DELTA,
  ROW_COUNT,
  START_MRR,
  assertUniqueIds,
  buildSeedRows,
  heroLoopFrames,
} from "@/lib/hero-demo-sequence";
import { EXAMPLE_ORDER_SPECS, HERO_ORDERS, SAMPLE_ORDERS } from "@/lib/sample-data";

describe("hero demo sequence", () => {
  it("seeds 9 rows and starts MRR at 4180 with a +6% cap", () => {
    expect(BASE_MRR).toBe(4180);
    expect(START_MRR).toBe(BASE_MRR);
    expect(MAX_DELTA).toBe(0.06);
    expect(buildSeedRows()).toHaveLength(ROW_COUNT);
    expect(LANDING_SPECS).toHaveLength(14);
    expect(LANDING_TOTAL).toBe(251);
  });

  it("final rows match the shared /sample hero continuum", () => {
    expect(HERO_ORDERS).toHaveLength(9);
    expect(HERO_ORDERS[0]?.id).toBe("EX-10457");
    expect(SAMPLE_ORDERS[1]?.id).toBe("EX-10457");
    expect(FINAL_ROWS[0]?.id).toBe(HERO_ORDERS[0]?.id);
    expect(FINAL_ROWS[0]?.product).toBe(EXAMPLE_ORDER_SPECS[0]?.product);
    expect(FINAL_ROWS.map((r) => r.id)).toEqual(HERO_ORDERS.map((o) => o.id));
  });

  it("every loop frame has unique IDs and exactly 9 rows", () => {
    const frames = heroLoopFrames();
    expect(frames.length).toBe(1 + LANDING_SPECS.length + 1);
    for (const frame of frames) {
      expect(frame).toHaveLength(ROW_COUNT);
      expect(assertUniqueIds(frame)).toEqual([]);
    }
    // Seed IDs and landing IDs must never share a namespace.
    const seedIds = new Set(buildSeedRows().map((r) => r.id));
    const landingIds = LANDING_SPECS.map((_, i) => `EX-${10500 + i}`);
    for (const id of landingIds) {
      expect(seedIds.has(id)).toBe(false);
    }
  });
});
