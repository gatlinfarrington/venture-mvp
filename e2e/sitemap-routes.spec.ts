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

      // Fail fast with a clear owner message if we landed on Vercel SSO / protection
      const landed = page.url();
      if (/vercel\.com\/(login|sso-api)/i.test(landed)) {
        throw new Error(
          `BLOCKED (owner): ${route} redirected to Vercel Authentication (${landed}). ` +
            `Add GitHub Actions secret VERCEL_AUTOMATION_BYPASS_SECRET (Protection Bypass for Automation) ` +
            `or disable Deployment Protection on preview deployments.`,
        );
      }

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

      // Viewport snapshot (stable in CI). Full-page PNGs are saved as artifacts above.
      // Use hyphens (not underscores): Playwright sanitizes snapshot names and
      // existing baselines for nested routes already use hyphens (docs-api-keys, …).
      const snapBase =
        route === "/" ? "home" : route.slice(1).replace(/\//g, "-");
      await expect(page).toHaveScreenshot(`${snapBase}.png`, {
        fullPage: false,
        maxDiffPixelRatio: 0.05,
        animations: "disabled",
        caret: "hide",
      });

      consoleCollector.dispose();
      expect(
        consoleCollector.errors,
        `Console errors on ${route}:\n${consoleCollector.errors.join("\n")}`,
      ).toEqual([]);
    });
  }
});

test("404 page returns 404 with noindex and stable screenshot", async ({ page }, testInfo) => {
  const viewport = testInfo.project.name.includes("mobile")
    ? "mobile-390"
    : "desktop-1440";

  const response = await page.goto("/this-page-is-not-a-real-route", {
    waitUntil: "domcontentloaded",
  });
  expect(response, "404 navigation").not.toBeNull();
  expect(response!.status(), "404 HTTP status").toBe(404);

  await page.waitForLoadState("load");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "This page isn't in the sheet",
  );
  await expect(page).toHaveTitle("Page not found · RevenueSheet");
  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute(
    "content",
    /noindex/,
  );
  const ogImage = await page.locator('meta[property="og:image"]').first().getAttribute("content");
  expect(ogImage, "404 og:image").toBeTruthy();
  expect(ogImage!).toMatch(/\/opengraph-image/);
  expect(ogImage!).not.toMatch(/this-page-is-not-a-real-route/);
  const twImage = await page.locator('meta[name="twitter:image"]').first().getAttribute("content");
  expect(twImage, "404 twitter:image").toBeTruthy();
  expect(twImage!).toMatch(/\/opengraph-image/);
  expect(twImage!).not.toMatch(/this-page-is-not-a-real-route/);

  await page.waitForTimeout(400);
  await expectNoHorizontalOverflow(page);

  const artifactPath = await saveFullPageScreenshot(page, "/404", viewport);
  await testInfo.attach(`${viewport}/404`, {
    path: artifactPath,
    contentType: "image/png",
  });

  await expect(page).toHaveScreenshot("404.png", {
    fullPage: false,
    maxDiffPixelRatio: 0.05,
    animations: "disabled",
    caret: "hide",
  });
});
