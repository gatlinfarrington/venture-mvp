/**
 * Mobile Lighthouse + axe on key marketing routes.
 * Usage: BASE_URL=http://127.0.0.1:3000 node scripts/mobile-a11y-audit.mjs
 */
import { chromium, devices } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";

const base = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const routes = ["/", "/pricing", "/vs/polar-dashboard", "/docs/mrr-and-churn"];
const outDir = join(process.cwd(), "artifacts", "a11y-batch");
mkdirSync(outDir, { recursive: true });

function scorePct(cat) {
  if (!cat || typeof cat.score !== "number") return null;
  return Math.round(cat.score * 100);
}

async function runLighthouse(url) {
  const chrome = await chromeLauncher.launch({
    chromeFlags: ["--headless", "--no-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const result = await lighthouse(url, {
      port: chrome.port,
      output: "json",
      logLevel: "error",
      formFactor: "mobile",
      screenEmulation: {
        mobile: true,
        width: 390,
        height: 844,
        deviceScaleFactor: 2,
        disabled: false,
      },
      onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
    });
    const cats = result.lhr.categories;
    return {
      performance: scorePct(cats.performance),
      accessibility: scorePct(cats.accessibility),
      bestPractices: scorePct(cats["best-practices"]),
      seo: scorePct(cats.seo),
      audits: result.lhr.audits,
    };
  } finally {
    await chrome.kill();
  }
}

async function runAxe(url) {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  try {
    const context = await browser.newContext({
      ...devices["iPhone 12"],
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "networkidle" });
    const results = await new AxeBuilder({ page }).analyze();
    return {
      violations: results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        nodes: v.nodes.length,
        helpUrl: v.helpUrl,
        targets: v.nodes.slice(0, 5).map((n) => n.target),
      })),
      passes: results.passes.length,
      incomplete: results.incomplete.length,
    };
  } finally {
    await browser.close();
  }
}

const report = [];
let failed = false;

for (const route of routes) {
  const url = `${base}${route}`;
  console.error(`Auditing ${url}…`);
  const lh = await runLighthouse(url);
  const axe = await runAxe(url);
  const row = { route, lighthouse: lh, axe: { violationCount: axe.violations.length, violations: axe.violations, passes: axe.passes } };
  report.push(row);

  for (const [k, v] of Object.entries({
    performance: lh.performance,
    accessibility: lh.accessibility,
    bestPractices: lh.bestPractices,
    seo: lh.seo,
  })) {
    if (v != null && v < 95) {
      failed = true;
      console.error(`  FAIL ${route} LH ${k}=${v}`);
    } else {
      console.error(`  OK   ${route} LH ${k}=${v}`);
    }
  }
  if (axe.violations.length) {
    failed = true;
    console.error(`  FAIL ${route} axe violations=${axe.violations.length}`);
    for (const v of axe.violations) {
      console.error(`       - [${v.impact}] ${v.id}: ${v.description} (${v.nodes} nodes)`);
    }
  } else {
    console.error(`  OK   ${route} axe clean`);
  }
}

const summaryPath = join(outDir, "summary.json");
writeFileSync(summaryPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.map((r) => ({
  route: r.route,
  lighthouse: {
    performance: r.lighthouse.performance,
    accessibility: r.lighthouse.accessibility,
    bestPractices: r.lighthouse.bestPractices,
    seo: r.lighthouse.seo,
  },
  axeViolations: r.axe.violationCount,
})), null, 2));
console.error(`Wrote ${summaryPath}`);
process.exit(failed ? 1 : 0);
