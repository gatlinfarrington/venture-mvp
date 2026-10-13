import { expect, test } from "@playwright/test";

/** Pages where .prose must keep a readable measure at desktop width. */
const PROSE_ROUTES = [
  "/blog/why-revenue-belongs-in-sheets",
  "/about",
  "/docs/faq",
] as const;

test.describe("prose measure at 1280", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  for (const route of PROSE_ROUTES) {
    test(`${route} .prose stays ≤700px wide`, async ({ page }, testInfo) => {
      // Measure is a desktop rule; skip the mobile project (viewport override still
      // runs, but the suite only needs one pass at 1280).
      test.skip(
        testInfo.project.name.includes("mobile"),
        "desktop measure only",
      );

      const res = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(res, `navigation to ${route}`).not.toBeNull();
      expect(res!.status(), `${route} status`).toBe(200);

      const prose = page.locator("main .prose").first();
      await expect(prose).toBeVisible();
      const width = await prose.evaluate((el) => {
        return (el as HTMLElement).getBoundingClientRect().width;
      });
      expect(
        width,
        `${route} .prose was ${width}px wide (expected ≤700 at 1280)`,
      ).toBeLessThanOrEqual(700);
    });
  }
});
