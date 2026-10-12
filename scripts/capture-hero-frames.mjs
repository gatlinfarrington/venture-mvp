/**
 * Capture hero demo frame strips at 1440 / 768 / 375 into docs/hero-frames/.
 * Usage: BASE_URL=http://127.0.0.1:3000 node scripts/capture-hero-frames.mjs
 */
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3000";
const GAP_MS = 1100;
const START_DELAY_MS = 600;
const SETTLE_PAD_MS = 400;
const LANDINGS = 14;
const LOOP_MS = START_DELAY_MS + LANDINGS * GAP_MS + SETTLE_PAD_MS + 800;
const FRAME_MS = 500;

const WIDTHS = [
  { name: "1440", width: 1440, height: 900 },
  { name: "768", width: 768, height: 900 },
  { name: "375", width: 375, height: 812 },
];

function assertHealthy(report, label) {
  if (report.count !== 9) throw new Error(`${label}: expected 9 rows, got ${report.count}`);
  if (report.uniqueCount !== report.count) {
    throw new Error(`${label}: duplicate IDs ${report.ids.join(",")}`);
  }
  if (report.overlaps.length) {
    throw new Error(`${label}: overlaps ${report.overlaps.join(",")}`);
  }
}

async function measure(page) {
  return page.locator("[data-hero-demo] .hero-sheet tbody").evaluate((tbody) => {
    const rows = [...tbody.querySelectorAll("tr[data-row-id]")];
    const ids = rows.map((tr) => tr.dataset.rowId || "");
    const boxes = rows.map((tr) => {
      const r = tr.getBoundingClientRect();
      return { id: tr.dataset.rowId, top: r.top, bottom: r.bottom };
    });
    const overlaps = [];
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        if (a.bottom > b.top + 0.5 && b.bottom > a.top + 0.5) {
          overlaps.push(`${a.id}|${b.id}`);
        }
      }
    }
    return { count: rows.length, ids, uniqueCount: new Set(ids).size, overlaps };
  });
}

const browser = await chromium.launch();
for (const vp of WIDTHS) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  await page.goto(BASE_URL + "/", { waitUntil: "networkidle" });
  // HeroDemo is lazy-loaded; wait for the hydrated table (not the SSR skeleton).
  await page.waitForSelector("[data-hero-demo] .hero-sheet tbody tr[data-row-id]", {
    timeout: 60_000,
  });
  const outDir = path.join(process.cwd(), "docs", "hero-frames", vp.name);
  fs.mkdirSync(outDir, { recursive: true });
  // Clear prior frames so the strip matches this loop only.
  for (const f of fs.readdirSync(outDir)) {
    if (f.endsWith(".png")) fs.unlinkSync(path.join(outDir, f));
  }
  const stage = page.locator("[data-hero-demo]");
  await stage.scrollIntoViewIfNeeded();
  await page.locator(".hero-replay").click();
  const frames = Math.ceil(LOOP_MS / FRAME_MS);
  for (let i = 0; i < frames; i++) {
    const report = await measure(page);
    assertHealthy(report, `${vp.name} frame ${i}`);
    await stage.screenshot({
      path: path.join(outDir, `frame-${String(i).padStart(2, "0")}.png`),
    });
    await page.waitForTimeout(FRAME_MS);
  }
  console.log(`wrote ${frames} frames → docs/hero-frames/${vp.name}/`);
  await context.close();
}
await browser.close();
console.log("done");
