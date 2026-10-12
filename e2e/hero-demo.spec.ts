import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { HERO_LANDINGS } from "../lib/hero-demo-sequence";

const GAP_MS = 1100;
const START_DELAY_MS = 600;
const REST_MS = 2400;
const LOOP_MS = START_DELAY_MS + HERO_LANDINGS.length * GAP_MS + REST_MS + 800;
const FRAME_MS = 500;

const WIDTHS = [
  { name: "1440", width: 1440, height: 900 },
  { name: "768", width: 768, height: 900 },
  { name: "375", width: 375, height: 812 },
] as const;

async function assertTableHealthy(page: Page) {
  const sheet = page.locator("[data-hero-demo] .hero-sheet tbody");
  await expect(sheet).toBeVisible();
  const report = await page.locator(".hero-sheet").evaluate((sheet) => {
    const tbody = sheet.querySelector("tbody")!;
    const head = sheet.querySelector("thead")!.getBoundingClientRect();
    const clip = (sheet.closest(".hero-sheet-wrap") || sheet).getBoundingClientRect();
    const rows = [...tbody.querySelectorAll<HTMLElement>("tr[data-row-id]")]
      .map((tr) => {
        const r = tr.getBoundingClientRect();
        const o = +getComputedStyle(tr).opacity;
        return {
          id: tr.dataset.rowId ?? "",
          top: r.top,
          bottom: r.bottom,
          o,
        };
      })
      .filter((r) => r.o > 0.05 && r.bottom > head.bottom + 1 && r.top < clip.bottom - 1);
    const ids = rows.map((r) => r.id);
    const overlaps: string[] = [];
    const s = [...rows].sort((a, b) => a.top - b.top);
    for (let i = 1; i < s.length; i++) {
      const d = s[i]!.top - s[i - 1]!.bottom;
      if (d < -1.5) overlaps.push(`${s[i - 1]!.id}|${s[i]!.id}`);
    }
    return {
      count: rows.length,
      ids,
      uniqueCount: new Set(ids).size,
      overlaps,
    };
  });
  expect(report.count, "hero table should show 9 visible rows").toBe(9);
  expect(report.uniqueCount, `duplicate IDs: ${report.ids.join(",")}`).toBe(report.count);
  expect(report.overlaps, "overlapping row boxes").toEqual([]);
}

test.describe("hero demo table integrity", () => {
  for (const vp of WIDTHS) {
    test(`no overlap or duplicate IDs across a full loop at ${vp.name}`, async ({
      page,
    }, testInfo) => {
      // Run once on desktop project so CI does not double the long loop.
      test.skip(
        testInfo.project.name !== "desktop-1440",
        "Loop coverage runs on desktop-1440 only",
      );
      test.setTimeout(120_000);

      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.goto("/", { waitUntil: "networkidle" });
      await page.waitForSelector(
        "[data-hero-demo] .hero-sheet tbody tr[data-row-id]",
        { timeout: 60_000 },
      );

      // Frame strips are committed via scripts/capture-hero-frames.mjs.
      // Set CAPTURE_HERO_FRAMES=1 to refresh docs/hero-frames/ during this test.
      const capture = process.env.CAPTURE_HERO_FRAMES === "1";
      const outDir = path.join(process.cwd(), "docs", "hero-frames", vp.name);
      if (capture) fs.mkdirSync(outDir, { recursive: true });

      const stage = page.locator("[data-hero-demo]");
      await stage.scrollIntoViewIfNeeded();

      const replay = page.locator(".hero-replay");
      await expect(replay).toBeVisible({ timeout: 30_000 });
      await replay.click();

      const frames = Math.ceil(LOOP_MS / FRAME_MS);
      for (let i = 0; i < frames; i++) {
        await assertTableHealthy(page);
        if (capture) {
          await stage.screenshot({
            path: path.join(outDir, `frame-${String(i).padStart(2, "0")}.png`),
          });
        }
        await page.waitForTimeout(FRAME_MS);
      }

      await page.emulateMedia({ reducedMotion: "reduce" });
      await replay.click();
      await page.waitForTimeout(200);
      await assertTableHealthy(page);
      const ids = await page
        .locator("[data-hero-demo] .hero-sheet tbody tr[data-row-id]")
        .evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset.rowId));
      expect(ids[0]).toBe("EX-10470");
      expect(new Set(ids).size).toBe(9);
    });
  }
});
