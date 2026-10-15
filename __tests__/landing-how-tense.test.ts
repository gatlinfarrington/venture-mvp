import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const src = readFileSync(join(process.cwd(), "components/LandingSections.tsx"), "utf8");

describe("homepage How it works tense", () => {
  it("uses future tense for backfill and scheduled sync", () => {
    expect(src).not.toMatch(/\bWe pull full order history\b/);
    expect(src).not.toMatch(/\bscheduled sync keeps the sheet current\b/);
    expect(src).toMatch(/At launch, we'll pull full order history/);
    expect(src).toMatch(/scheduled sync will keep the sheet current/);
  });

  it("uses future tense for Dashboard step landing copy", () => {
    expect(src).toMatch(/will land on a Dashboard tab/);
    expect(src).not.toMatch(/revenue by product land on a Dashboard tab/);
  });
});
