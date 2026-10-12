import { describe, expect, it } from "vitest";
import {
  BASE_MRR,
  FINAL_MRR,
  HERO_FINAL,
  HERO_LANDINGS,
  HERO_SEED,
  LANDING_TOTAL,
  MAX_DELTA,
  ROW_COUNT,
  START_MRR,
  assertUniqueIds,
  buildFinalRows,
  buildSeedRows,
  heroLoopFrames,
} from "@/lib/hero-demo-sequence";
import { ORDERS, SAMPLE_ORDERS } from "@/lib/sample-data";

describe("hero demo sequence (issue #60)", () => {
  it("uses one ORDERS continuum and +6% landing total", () => {
    expect(BASE_MRR).toBe(4180);
    expect(START_MRR).toBe(BASE_MRR);
    expect(MAX_DELTA).toBe(0.06);
    expect(ORDERS).toHaveLength(24);
    expect(ORDERS[0]?.id).toBe("EX-10470");
    expect(ORDERS[23]?.id).toBe("EX-10447");
    expect(HERO_SEED).toHaveLength(9);
    expect(HERO_SEED[0]?.id).toBe("EX-10456");
    expect(HERO_LANDINGS).toHaveLength(14);
    expect(HERO_LANDINGS[0]?.id).toBe("EX-10457");
    expect(HERO_LANDINGS[13]?.id).toBe("EX-10470");
    expect(LANDING_TOTAL).toBe(251);
    expect(FINAL_MRR).toBe(START_MRR + LANDING_TOTAL);
    expect(HERO_FINAL[0]?.id).toBe("EX-10470");
    expect(SAMPLE_ORDERS).toBe(ORDERS);
  });

  it("final hero rows are the first 9 ORDERS; sample shares them", () => {
    expect(buildFinalRows().map((r) => r.id)).toEqual(
      ORDERS.slice(0, 9).map((o) => o.id),
    );
    expect(SAMPLE_ORDERS[0]?.id).toBe(HERO_FINAL[0]?.id);
    expect(buildSeedRows()).toHaveLength(ROW_COUNT);
  });

  it("every loop frame has unique IDs and exactly 9 rows", () => {
    const frames = heroLoopFrames();
    expect(frames.length).toBe(1 + HERO_LANDINGS.length + 1);
    for (const frame of frames) {
      expect(frame).toHaveLength(ROW_COUNT);
      expect(assertUniqueIds(frame)).toEqual([]);
    }
  });
});
