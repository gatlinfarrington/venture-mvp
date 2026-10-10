import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("hero demo MOTION.md sequence", () => {
  const src = readFileSync("components/HeroDemo.tsx", "utf8");

  it("seeds 9 contiguous newest-first rows and starts MRR at 4180", () => {
    expect(src).toMatch(/const BASE_MRR = 4180/);
    expect(src).toMatch(/const START_MRR = BASE_MRR/);
    expect(src).toMatch(/EX-\$\{10449 - i\}/);
    expect(src).toMatch(/SEED_SPECS/);
    const seedBlock = src.slice(src.indexOf("SEED_SPECS"), src.indexOf("LANDING_SPECS"));
    expect((seedBlock.match(/source:/g) || []).length).toBe(9);
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
