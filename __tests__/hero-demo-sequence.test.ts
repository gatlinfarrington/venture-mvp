import { describe, expect, it } from "vitest";
import {
  FINAL_MRR,
  HERO_FINAL,
  HERO_LANDINGS,
  HERO_SEED,
  LANDING_TOTAL,
  MOM_DELTA_LABEL,
  START_MRR,
  assertMrrContinuum,
  assertUniqueIds,
  buildFinalRows,
  buildSeedRows,
  heroLoopFrames,
  ROW_COUNT,
} from "@/lib/hero-demo-sequence";
import { ORDERS, SAMPLE_MRR_MOM, SAMPLE_MRR_OCT, SAMPLE_ORDERS } from "@/lib/sample-data";

describe("hero demo sequence (SAMPLE-DATASET)", () => {
  it("uses one ORDERS continuum and ends at sample headline MRR", () => {
    expect(FINAL_MRR).toBe(SAMPLE_MRR_OCT);
    expect(FINAL_MRR).toBe(4516);
    expect(START_MRR).toBe(4414);
    expect(LANDING_TOTAL).toBe(
      HERO_LANDINGS.reduce((s, o) => s + o.mrrDelta, 0),
    );
    expect(assertMrrContinuum()).toBe(true);
    expect(ORDERS.length).toBe(261);
    expect(HERO_SEED).toHaveLength(9);
    expect(HERO_LANDINGS).toHaveLength(14);
    expect(HERO_LANDINGS[0]?.id).toBe("EX-10248");
    expect(HERO_FINAL[0]?.id).toBe("EX-10261");
    expect(SAMPLE_ORDERS).toEqual(ORDERS.slice(0, 24));
    expect(MOM_DELTA_LABEL).toBe(`+${SAMPLE_MRR_MOM.toFixed(1)}%`);
    expect(MOM_DELTA_LABEL).toBe("+4.5%");
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

  it("only new-sub landings move MRR", () => {
    const ticks = HERO_LANDINGS.filter((o) => o.mrrDelta > 0);
    expect(ticks.length).toBeGreaterThanOrEqual(3);
    expect(ticks.every((o) => o.kind === "new_sub" || o.mrrDelta > 0)).toBe(true);
    expect(START_MRR + LANDING_TOTAL).toBe(FINAL_MRR);
  });
});
