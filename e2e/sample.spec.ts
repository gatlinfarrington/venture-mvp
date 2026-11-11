import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import {
  DASHBOARD,
  ORDER_HEADERS,
  SAMPLE_ORDERS,
  SAMPLE_SUBS,
  SUB_HEADERS,
} from "../lib/sample-data";

test.describe("/sample acceptance", () => {
  test("desktop: Dashboard fits, KPIs, tabs, Make a copy, axe", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name === "mobile-390",
      "Desktop layout covered here; mobile covered in sibling test",
    );

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/sample", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");

    await expect(page).toHaveTitle(/Sample sheet · RevenueSheet/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "The sheet you get, filled in.",
    );

    const frame = page.locator(".sample-frame");
    await expect(frame).toBeVisible();
    await expect(frame).toHaveAttribute(
      "aria-label",
      "Sample RevenueSheet spreadsheet, read only, example data",
    );
    await expect(page.locator(".sample-example-pill")).toHaveText("EXAMPLE DATA");
    await expect(page.locator(".sample-caption")).toContainText("alex@example.com");

    await expect(page.getByText(DASHBOARD.mrr)).toBeVisible();
    await expect(page.getByText(DASHBOARD.netRevenue)).toBeVisible();
    await expect(
      page.locator(".sample-kv", { hasText: new RegExp(`^${DASHBOARD.activeSubs}$`) }),
    ).toBeVisible();
    await expect(page.getByText(DASHBOARD.churn, { exact: true })).toBeVisible();
    await expect(page.getByText(DASHBOARD.mrrDelta)).toBeVisible();
    await expect(page.getByText(DASHBOARD.pastDueLine)).toBeVisible();
    await expect(page.getByText("261 orders · 30D")).toBeVisible();
    for (const src of DASHBOARD.sources) {
      if (!src.detail) continue;
      const name = page.locator(".sample-src-name", {
        hasText: new RegExp(`^${src.name}$`),
      });
      await expect(name).toBeVisible();
      const row = page.locator("tr").filter({ has: name });
      await expect(row.locator(".sample-num.muted")).toHaveText(src.detail);
      await expect(row.locator(".sample-num").last()).toHaveText(src.state);
    }

    const scroll = page.locator(".sample-scroll");
    const dashOverflow = await scroll.evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(dashOverflow, "Dashboard should fit at 1440 without frame scroll").toBeLessThanOrEqual(2);

    const copy = page.locator(".sample-copy-btn");
    await expect(copy).toHaveAttribute("aria-disabled", "true");
    await expect(copy).not.toHaveAttribute("href");
    await copy.focus();
    await expect(page.locator("#sample-copy-tip")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("#sample-copy-tip")).not.toHaveClass(/is-open/);

    const download = page.getByRole("link", { name: "Download the template (.xlsx)" });
    await expect(download).toBeVisible();
    await expect(download).toHaveClass(/btn-secondary/);
    await expect(download).toHaveAttribute("href", "/revenuesheet-template.xlsx");

    const tabs = page.getByRole("tablist", { name: "Sheet tabs" });
    await tabs.getByRole("tab", { name: "Orders" }).click();
    await expect(page).toHaveURL(/#orders/);
    for (const h of ORDER_HEADERS) {
      await expect(page.getByRole("columnheader", { name: h })).toBeVisible();
    }
    await expect(page.getByRole("gridcell", { name: SAMPLE_ORDERS[0]!.id })).toBeVisible();
    await expect(page.getByRole("gridcell", { name: SAMPLE_ORDERS[0]!.email })).toBeVisible();

    await tabs.getByRole("tab", { name: "Subscriptions" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: "Dashboard" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await page.keyboard.press("End");
    await expect(page.getByRole("tab", { name: "Subscriptions" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    for (const h of SUB_HEADERS) {
      await expect(page.getByRole("columnheader", { name: h })).toBeVisible();
    }
    await expect(page.getByRole("gridcell", { name: SAMPLE_SUBS[0]!.id })).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });

  test("mobile: page does not scroll sideways; frame does", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-390", "Mobile-only");

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/sample", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");

    const pageOverflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return {
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
      };
    });
    expect(pageOverflow.scrollWidth).toBeLessThanOrEqual(pageOverflow.clientWidth + 1);

    const scroll = page.locator(".sample-scroll");
    const frameScroll = await scroll.evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(frameScroll).toBeGreaterThan(8);

    await expect(page.locator(".sample-scroll-hint")).toHaveClass(/is-visible/);
    await scroll.evaluate((el) => {
      el.scrollLeft = 40;
    });
    await expect(page.locator(".sample-scroll-hint")).not.toHaveClass(/is-visible/);

    await expect(page.locator(".sample-fx")).toBeHidden();
    await expect(page.locator(".sample-example-pill")).toBeVisible();
    await expect(page.locator(".sample-rn").first()).toBeVisible();
  });

  test("hash #orders opens Orders tab", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile-390", "Covered on desktop");
    await page.goto("/sample#orders", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("tab", { name: "Orders" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByRole("gridcell", { name: SAMPLE_ORDERS[0]!.id })).toBeVisible();
    await expect(page.getByRole("gridcell", { name: "EX-10257" })).toBeVisible();
  });
});
