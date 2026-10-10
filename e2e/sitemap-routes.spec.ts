import { expect, test } from "@playwright/test";
import {
  attachConsoleErrorCollector,
  expectInternalNavLinksResolve,
  expectNoHorizontalOverflow,
  saveFullPageScreenshot,
} from "./helpers";
import { SITEMAP_ROUTES } from "./routes";

const baseURL =
  process.env.BASE_URL ||
  process.env.PLAYWRIGHT_BASE_URL ||
  "https://venture-mvp.vercel.app";

for (const route of SITEMAP_ROUTES) {
  test.describe(`sitemap route ${route}`, () => {
    test(`returns 200, no console errors, no overflow, nav resolves, screenshot`, async ({
      page,
      request,
    }, testInfo) => {
      const viewport = testInfo.project.name.includes("mobile")
        ? "mobile-390"
        : "desktop-1440";

      const consoleCollector = attachConsoleErrorCollector(page);

      const response = await page.goto(route, {
        waitUntil: "domcontentloaded",
      });
      expect(response, `navigation to ${route}`).not.toBeNull();
      expect(response!.status(), `${route} HTTP status`).toBe(200);

      // Also assert via API request for a clean status check
      const head = await request.get(new URL(route, baseURL).toString());
      expect(head.status(), `${route} request status`).toBe(200);

      await page.waitForLoadState("load");
      await expect(page.locator("body")).toBeVisible();
      // Settle layout / fonts before overflow + screenshot checks
      await page.waitForTimeout(500);

      await expectNoHorizontalOverflow(page);
      await expectInternalNavLinksResolve(page, baseURL);

      // Artifact screenshot for CI upload (desktop + mobile)
      const artifactPath = await saveFullPageScreenshot(page, route, viewport);
      await testInfo.attach(`screenshot-${viewport}`, {
        path: artifactPath,
        contentType: "image/png",
      });

      // Playwright visual snapshot (project name is appended automatically)
      const snapBase =
        route === "/" ? "home" : route.slice(1).replace(/\//g, "_");
      await expect(page).toHaveScreenshot(`${snapBase}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.05,
        animations: "disabled",
      });

      consoleCollector.dispose();
      expect(
        consoleCollector.errors,
        `Console errors on ${route}:\n${consoleCollector.errors.join("\n")}`,
      ).toEqual([]);
    });
  });
}
