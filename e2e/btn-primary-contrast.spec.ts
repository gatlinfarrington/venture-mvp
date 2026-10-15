import { expect, test } from "@playwright/test";
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

test("btn-primary never matches fill or underline across sitemap", async ({
  page,
}, testInfo) => {
  // One viewport is enough: this asserts computed styles, not layout.
  test.skip(
    testInfo.project.name.includes("mobile"),
    "desktop-only contrast sweep",
  );

  const failures: string[] = [];

  for (const route of routes) {
    await test.step(route, async () => {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(response, `navigation to ${route}`).not.toBeNull();
      expect(response!.status(), `${route} HTTP status`).toBeLessThan(400);
      await page.waitForLoadState("load");

      const bad = await page.evaluate(() => {
        const out: string[] = [];
        const buttons = Array.from(
          document.querySelectorAll<HTMLElement>(".btn-primary"),
        );
        for (const el of buttons) {
          const style = getComputedStyle(el);
          const color = style.color;
          const background = style.backgroundColor;
          const deco = style.textDecorationLine || style.textDecoration;
          if (color === background) {
            out.push(
              `${el.tagName.toLowerCase()}.${el.className.trim().replace(/\s+/g, ".")}: color===background (${color})`,
            );
          }
          if (/\bunderline\b/i.test(deco)) {
            out.push(
              `${el.tagName.toLowerCase()}.${el.className.trim().replace(/\s+/g, ".")}: underlined (${deco})`,
            );
          }
        }
        return out;
      });

      for (const msg of bad) failures.push(`${route}: ${msg}`);
    });
  }

  expect(failures, failures.join("\n")).toEqual([]);
});
