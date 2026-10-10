import { test, expect } from "@playwright/test";

/**
 * Prod QA: `.lands-frame img { display:block }` must not beat the phone/desktop
 * crop toggles — exactly one crop image visible at phone and desktop widths.
 */
for (const width of [375, 1280] as const) {
  test(`lands-frame shows exactly one visible img at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 375 ? 812 : 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const frame = page.locator(".lands-frame");
    await frame.scrollIntoViewIfNeeded();
    await expect(frame.locator("img")).toHaveCount(2);

    const visibleCount = await frame.locator("img").evaluateAll((imgs) =>
      imgs.filter((img) => {
        const style = window.getComputedStyle(img);
        if (style.display === "none" || style.visibility === "hidden") return false;
        const rect = img.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }).length,
    );
    expect(visibleCount, `expected one visible crop at ${width}px`).toBe(1);
  });
}
