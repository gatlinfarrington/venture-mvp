import { expect, test } from "@playwright/test";
import {
  attachConsoleErrorCollector,
  expectInternalNavLinksResolve,
  expectNoHorizontalOverflow,
  saveFullPageScreenshot,
} from "./helpers";
import {
  EXTRA_SMOKE_ROUTES,
  fetchAllSmokeRoutes,
  SITEMAP_ROUTES_FALLBACK,
} from "./routes";

const baseURL =
  process.env.BASE_URL ||
  process.env.PLAYWRIGHT_BASE_URL ||
  "https://venture-mvp.vercel.app";

test.describe.configure({ mode: "serial" });

let routes: string[] = [...SITEMAP_ROUTES_FALLBACK, ...EXTRA_SMOKE_ROUTES];

test.beforeAll(async () => {
  routes = await fetchAllSmokeRoutes(baseURL);
  expect(routes.length, "sitemap should expose at least one route").toBeGreaterThan(0);
});

test("covers every sitemap route at this viewport", async ({ page, request }, testInfo) => {
  const viewport = testInfo.project.name.includes("mobile")
    ? "mobile-390"
    : "desktop-1440";

  for (const route of routes) {
    await test.step(route, async () => {
      const consoleCollector = attachConsoleErrorCollector(page);

      const response = await page.goto(route, {
        waitUntil: "domcontentloaded",
      });
      expect(response, `navigation to ${route}`).not.toBeNull();
      expect(response!.status(), `${route} HTTP status`).toBe(200);

      const head = await request.get(new URL(route, baseURL).toString());
      expect(head.status(), `${route} request status`).toBe(200);

      await page.waitForLoadState("load");
      await expect(page.locator("body")).toBeVisible();
      await page.waitForTimeout(400);

      await expectNoHorizontalOverflow(page);
      await expectInternalNavLinksResolve(page, baseURL);

      const artifactPath = await saveFullPageScreenshot(page, route, viewport);
      await testInfo.attach(`${viewport}${route === "/" ? "/home" : route}`, {
        path: artifactPath,
        contentType: "image/png",
      });

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
  }
});
