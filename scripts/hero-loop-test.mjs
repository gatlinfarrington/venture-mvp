// Hero loop acceptance test. Usage: node scripts/hero-loop-test.mjs [url] [outdir]
// Samples the hero order table every 100ms over one full loop and checks:
// no overlapping rows, no duplicate IDs, no blank band (gap > 2px between rows, or
// empty space under the last visible row taller than 2px inside the clip box).
import { chromium } from "playwright-core";
import fs from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pw = require("playwright-core");
const executablePath = pw.chromium.executablePath();

const URL = process.argv[2] || "https://www.revenuesheet.app/";
const OUT = process.argv[3] || "/tmp/hero-loop-report";
const LOOP_MS = Number(process.env.LOOP_MS || 19000);
const STEP = 100;
const WIDTH = Number(process.env.VIEWPORT_WIDTH || 1440);
const HEIGHT = Number(process.env.VIEWPORT_HEIGHT || 900);
const REPLAY_AT = process.env.REPLAY_AT ? Number(process.env.REPLAY_AT) : null;

fs.mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({
  executablePath,
  args: ["--no-sandbox"],
});
const p = await b.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
await p.emulateMedia({ reducedMotion: "no-preference" });
await p.goto(URL, { waitUntil: "networkidle" });
await p.waitForSelector(".hero-sheet tbody tr", { timeout: 60_000 });
await p.locator("[data-hero-demo], .hero-stage").first().scrollIntoViewIfNeeded();

const sha = await p
  .evaluate(() =>
    fetch("/api/version")
      .then((r) => r.json())
      .then((j) => j.sha)
      .catch(() => "?"),
  )
  .catch(() => "?");

const frames = [];
const fails = [];
const t0 = Date.now();
let replayClicked = false;

while (Date.now() - t0 < LOOP_MS) {
  const t = Date.now() - t0;
  if (REPLAY_AT != null && !replayClicked && t >= REPLAY_AT) {
    const replay = p.locator(".hero-replay");
    if (await replay.isVisible().catch(() => false)) {
      await replay.click();
      replayClicked = true;
    }
  }
  const f = await p.evaluate(() => {
    const sheet = document.querySelector(".hero-sheet");
    if (!sheet) return { rows: [], clipBottom: 0, headBottom: 0 };
    const tbody = sheet.querySelector("tbody");
    const clip = (sheet.closest(".hero-sheet-wrap") || sheet).getBoundingClientRect();
    const head = sheet.querySelector("thead").getBoundingClientRect();
    const rows = [...tbody.querySelectorAll("tr")]
      .map((tr) => {
        const r = tr.getBoundingClientRect();
        const o = +getComputedStyle(tr).opacity;
        return {
          id: tr.cells[0]?.innerText.trim(),
          top: r.top,
          bottom: r.bottom,
          h: r.height,
          o,
        };
      })
      .filter((r) => r.o > 0.05 && r.bottom > head.bottom + 1 && r.top < clip.bottom - 1);
    return { rows, clipBottom: clip.bottom, headBottom: head.bottom };
  });
  const issues = [];
  const ids = f.rows.map((r) => r.id);
  const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
  if (dup.length) issues.push("duplicate " + [...new Set(dup)].join(","));
  const s = [...f.rows].sort((a, c) => a.top - c.top);
  for (let i = 1; i < s.length; i++) {
    const d = s[i].top - s[i - 1].bottom;
    if (d < -1.5) issues.push(`overlap ${s[i - 1].id}/${s[i].id} ${d.toFixed(1)}px`);
    if (d > 2) issues.push(`gap ${s[i - 1].id}/${s[i].id} ${d.toFixed(1)}px`);
  }
  if (s.length) {
    if (s[0].top - f.headBottom > 2) {
      issues.push(`gap under header ${(s[0].top - f.headBottom).toFixed(1)}px`);
    }
    const tail = f.clipBottom - s.at(-1).bottom;
    if (tail > 2) issues.push(`blank band at bottom ${tail.toFixed(1)}px`);
  }
  const heights = [...new Set(f.rows.map((r) => Math.round(r.h)))];
  if (heights.length > 1) issues.push("row heights " + heights.join("/"));
  frames.push({ t, ids, issues });
  if (issues.length) {
    fails.push({ t, issues });
    if (fails.length <= 12) {
      await p
        .locator(".hero-sheet")
        .screenshot({ path: `${OUT}/fail-${String(t).padStart(5, "0")}.png` })
        .catch(() => {});
    }
  }
  const wait = STEP - (Date.now() - t0 - t);
  if (wait > 0) await p.waitForTimeout(wait);
}
await b.close();
const kinds = {};
for (const f of fails) {
  for (const i of f.issues) {
    const k = i.split(" ")[0] + (i.includes("bottom") ? " bottom" : "");
    kinds[k] = (kinds[k] || 0) + 1;
  }
}
const summary = {
  url: URL,
  sha,
  viewport: { width: WIDTH, height: HEIGHT },
  frames: frames.length,
  failingFrames: fails.length,
  issueCounts: kinds,
  firstFails: fails.slice(0, 10),
  replayAt: REPLAY_AT,
};
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify({ summary, frames }, null, 1));
console.log(JSON.stringify(summary, null, 1));
console.log(fails.length ? "RESULT: FAIL" : "RESULT: PASS");
process.exit(fails.length ? 1 : 0);
