// Hero loop acceptance test. Usage: node scripts/hero-loop-test.mjs [url] [outdir]
// Samples the hero order table every 100ms over one full loop and checks:
// no overlapping rows, no duplicate IDs, no blank band (gap > 2px between rows, or
// empty space under the last visible row taller than 2px inside the clip box).
// Also fails on any frame with zero visible rows (reset flash).
// Rows inside `.hero-rows-ghost` (aria-hidden reset overlay) are ignored for
// overlap/duplicate checks; they are only used as a fallback when the live
// layer is still fading in during a crossfade.
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
const WIDTH = Number(process.env.VIEWPORT_WIDTH || process.env.WIDTH || 1440);
const HEIGHT = Number(process.env.VIEWPORT_HEIGHT || (WIDTH < 600 ? 812 : 900));
const START_WAIT = Number(process.env.START_WAIT || 700);
const SAVE_ALL = Boolean(process.env.SAVE_ALL);
const REPLAY_AT = process.env.REPLAY_AT ? Number(process.env.REPLAY_AT) : null;

fs.mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({
  executablePath,
  args: ["--no-sandbox"],
});
const p = await b.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
await p.emulateMedia({ reducedMotion: "no-preference" });
await p.goto(URL, { waitUntil: "domcontentloaded" });
await p.waitForSelector(".hero-sheet tbody tr, .hero-sheet .hero-row", {
  timeout: 60_000,
});
await p.locator("[data-hero-demo], .hero-stage, .hero-sheet").first().scrollIntoViewIfNeeded();
// Let the hero entrance (~500ms) finish so it is not counted as a row jump.
await p.waitForTimeout(START_WAIT);

const hasHeroRow = Boolean(await p.$(".hero-sheet .hero-row"));

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
  const f = await p.evaluate((preferHeroRow) => {
    const sheet = document.querySelector(".hero-sheet");
    if (!sheet) {
      return {
        rows: [],
        clipBottom: 0,
        headBottom: 0,
        ghostPresent: false,
        bothFullOpacity: false,
      };
    }
    const hd = sheet.querySelector("thead, .hero-head, .hero-rows-head");
    const liveBody = sheet.querySelector(".hero-rows:not(.hero-rows-ghost)");
    const ghostBody = sheet.querySelector(".hero-rows-ghost");
    const clipEl = liveBody || sheet.closest(".hero-sheet-wrap") || sheet;
    const head = hd
      ? hd.getBoundingClientRect()
      : liveBody
        ? { bottom: liveBody.getBoundingClientRect().top }
        : sheet.getBoundingClientRect();
    const clip = clipEl.getBoundingClientRect();
    const rowSel = preferHeroRow ? ".hero-row" : "tbody tr";

    const mapRows = (root) =>
      [...root.querySelectorAll(rowSel)]
        .filter((tr) => {
          // Never count ghost-layer rows for the primary live set.
          if (tr.closest(".hero-rows-ghost")) return false;
          return true;
        })
        .map((tr) => {
          const r = tr.getBoundingClientRect();
          const o = +getComputedStyle(tr).opacity;
          const idEl = tr.cells ? tr.cells[0] : tr.firstElementChild;
          return {
            id: idEl?.textContent?.trim() ?? "",
            top: r.top,
            bottom: r.bottom,
            h: r.height,
            o,
          };
        })
        .filter(
          (r) => r.o > 0.05 && r.bottom > head.bottom + 1 && r.top < clip.bottom - 1,
        );

    const live = mapRows(liveBody || sheet);

    // Ghost fallback only when live is still fading in (true crossfade).
    let rows = live.filter((r) => r.top < clip.bottom - 1);
    if (rows.length === 0 && ghostBody) {
      rows = [...ghostBody.querySelectorAll(rowSel)]
        .map((tr) => {
          const r = tr.getBoundingClientRect();
          const o = +getComputedStyle(tr).opacity * +getComputedStyle(ghostBody).opacity;
          const idEl = tr.cells ? tr.cells[0] : tr.firstElementChild;
          return {
            id: idEl?.textContent?.trim() ?? "",
            top: r.top,
            bottom: r.bottom,
            h: r.height,
            o,
          };
        })
        .filter(
          (r) => r.o > 0.05 && r.bottom > head.bottom + 1 && r.top < clip.bottom - 1,
        );
    }

    const liveOp = liveBody ? +getComputedStyle(liveBody).opacity : 1;
    const ghostOp = ghostBody ? +getComputedStyle(ghostBody).opacity : 0;
    const bothFullOpacity = Boolean(
      ghostBody && liveOp > 0.95 && ghostOp > 0.95,
    );

    return {
      rows,
      clipBottom: clip.bottom,
      headBottom: head.bottom,
      ghostPresent: Boolean(ghostBody),
      bothFullOpacity,
    };
  }, hasHeroRow);

  const issues = [];
  if (f.bothFullOpacity) {
    issues.push("ghost+live both full opacity (not a true crossfade)");
  }
  if (f.rows.length === 0) issues.push("empty table (no visible rows)");
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
  const prevF = frames.at(-1);
  if (prevF) {
    for (const r of f.rows) {
      const o = prevF.pos?.[r.id];
      if (o != null && r.top - o < -2) {
        issues.push(`jump-up ${r.id} ${(r.top - o).toFixed(1)}px`);
      }
      if (o != null && r.top - o > 40) {
        issues.push(`jump ${r.id} +${(r.top - o).toFixed(1)}px`);
      }
    }
  }
  frames.push({
    t,
    ids,
    issues,
    ghostPresent: f.ghostPresent,
    bothFullOpacity: f.bothFullOpacity,
    pos: Object.fromEntries(f.rows.map((r) => [r.id, r.top])),
  });
  if (SAVE_ALL) {
    await p
      .locator(".hero-sheet")
      .screenshot({ path: `${OUT}/frame-${String(t).padStart(5, "0")}.png` })
      .catch(() => {});
  }
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
const earlyGhost = frames.filter((f) => f.t < 500 && f.ghostPresent).length;
const summary = {
  url: URL,
  sha,
  viewport: { width: WIDTH, height: HEIGHT },
  frames: frames.length,
  failingFrames: fails.length,
  issueCounts: kinds,
  firstFails: fails.slice(0, 10),
  replayAt: REPLAY_AT,
  earlyGhostFrames: earlyGhost,
};
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify({ summary, frames }, null, 1));
console.log(JSON.stringify(summary, null, 1));
console.log(fails.length ? "RESULT: FAIL" : "RESULT: PASS");
process.exit(fails.length ? 1 : 0);
