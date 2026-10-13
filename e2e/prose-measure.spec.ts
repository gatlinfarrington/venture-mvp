import { expect, test } from "@playwright/test";

/** Pages where .prose must keep a readable measure at desktop width. */
const PROSE_ROUTES = [
  "/blog/why-revenue-belongs-in-sheets",
  "/about",
  "/docs",
] as const;

test.describe("prose measure at 1280", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  for (const route of PROSE_ROUTES) {
    test(`${route} .prose stays ≤700px wide`, async ({ page }) => {
      const res = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(res, `navigation to ${route}`).not.toBeNull();
      expect(res!.status(), `${route} status`).toBe(200);

      const width = await page.locator("main .prose").first().evaluate((el) => {
        return (el as HTMLElement).getBoundingClientRect().width;
      });
      expect(
        width,
        `${route} .prose was ${width}px wide (expected ≤700 at 1280)`,
      ).toBeLessThanOrEqual(700);
    });
  }
});
