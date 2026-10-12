import { expect, test } from "@playwright/test";

/**
 * Smoke coverage for the hero table. Full acceptance is
 * `npm run test:hero` (scripts/hero-loop-test.mjs) which samples every 100ms.
 */
test.describe("hero demo table integrity", () => {
  test("seed rows are unique and non-overlapping; reduced motion shows final", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop-1440",
      "Hero integrity covered on desktop-1440",
    );

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForSelector(
      "[data-hero-demo] .hero-sheet tbody tr[data-row-id]",
      { timeout: 60_000 },
    );

    const stage = page.locator("[data-hero-demo]");
    await stage.scrollIntoViewIfNeeded();

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
            h: r.height,
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
        heights: [...new Set(rows.map((r) => Math.round(r.h)))],
      };
    });

    expect(report.count).toBe(9);
    expect(report.uniqueCount).toBe(9);
    expect(report.overlaps).toEqual([]);
    expect(report.heights).toEqual([36]);

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector(
      "[data-hero-demo] .hero-sheet tbody tr[data-row-id]",
      { timeout: 60_000 },
    );
    const ids = await page
      .locator("[data-hero-demo] .hero-sheet tbody tr[data-row-id]")
      .evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset.rowId));
    expect(ids[0]).toBe("EX-10470");
    expect(new Set(ids).size).toBe(9);
    await expect(page.locator(".hero-replay")).toBeHidden();
  });
});
