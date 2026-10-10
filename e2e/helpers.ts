import { expect, type ConsoleMessage, type Page, type Response } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const IGNORED_CONSOLE = [
  // Next.js / browser noise that is not an app bug
  /Download the React DevTools/i,
  /\[HMR\]/i,
  /third-party cookie/i,
];

export function attachConsoleErrorCollector(page: Page) {
  const errors: string[] = [];
  const onConsole = (msg: ConsoleMessage) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (IGNORED_CONSOLE.some((re) => re.test(text))) return;
    errors.push(text);
  };
  const onPageError = (err: Error) => {
    errors.push(err.message);
  };
  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  return {
    errors,
    dispose() {
      page.off("console", onConsole);
      page.off("pageerror", onPageError);
    },
  };
}

export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const scrollWidth = Math.max(doc.scrollWidth, body.scrollWidth);
    const clientWidth = doc.clientWidth;
    return {
      scrollWidth,
      clientWidth,
      overflowPx: scrollWidth - clientWidth,
    };
  });
  expect(
    overflow.overflowPx,
    `Horizontal overflow of ${overflow.overflowPx}px (scrollWidth=${overflow.scrollWidth}, clientWidth=${overflow.clientWidth})`,
  ).toBeLessThanOrEqual(1);
}

export async function expectInternalNavLinksResolve(page: Page, baseURL: string) {
  const hrefs = await page.evaluate(() => {
    const anchors = Array.from(
      document.querySelectorAll<HTMLAnchorElement>("header a[href], nav a[href], .mobile-drawer a[href], footer a[href]"),
    );
    return anchors
      .map((a) => a.getAttribute("href") || "")
      .filter((href) => href.startsWith("/") && !href.startsWith("//"));
  });

  const unique = [...new Set(hrefs)];
  for (const href of unique) {
    const pathOnly = href.split("#")[0] || "/";
    const url = new URL(pathOnly, baseURL).toString();
    const res = await page.request.get(url);
    expect(res.status(), `Nav link ${href} → ${url}`).toBeLessThan(400);
  }
}

export function screenshotName(route: string, viewport: string) {
  const safe = route === "/" ? "home" : route.replace(/^\//, "").replace(/\//g, "_");
  return `${safe}--${viewport}`;
}

export async function saveFullPageScreenshot(
  page: Page,
  route: string,
  viewport: string,
) {
  const dir = path.join(process.cwd(), "test-results", "screenshots", viewport);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${screenshotName(route, viewport)}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

export function isStripeNotConfigured(message: string | undefined) {
  if (!message) return false;
  return /STRIPE_SECRET_KEY is not configured|Missing Stripe price ID|not configured|REPLACE_ME/i.test(
    message,
  );
}

export async function waitForResponseOk(
  responsePromise: Promise<Response>,
  label: string,
) {
  const res = await responsePromise;
  expect(res.status(), label).toBe(200);
  return res;
}
