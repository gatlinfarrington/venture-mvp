import { test } from "@playwright/test";
import { expectNoHorizontalOverflow } from "./helpers";

/**
 * Phone width pass: document must not scroll sideways on the three
 * conversion routes (intentional in-frame scrollers like .sample-scroll are OK).
 */
const ROUTES = ["/", "/sample", "/pricing"] as const;

for (const route of ROUTES) {
  test(`no horizontal page overflow at 375px: ${route}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-390", "375 overflow covered on mobile project");

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");
    await page.waitForTimeout(300);
    await expectNoHorizontalOverflow(page);
  });
}
