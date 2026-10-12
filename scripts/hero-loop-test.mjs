// Hero loop acceptance test. Usage: node scripts/hero-loop-test.mjs [url] [outdir]
// Samples the hero order table every 100ms over one full loop and checks:
// no overlapping rows, no duplicate IDs, no blank band (gap > 2px between rows, or
// empty space under the last visible row taller than 2px inside the clip box).
// Also fails if the sheet is under 400px wide at viewport >= 1024, or any cell or
// the delta badge is cut off.
// The reset ghost layer (.hero-rows-ghost) is excluded: it is a deliberate fade-out overlay.
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

const ROWSEL = (await p.$(".hero-sheet .hero-row")) ? ".hero-row" : "tbody tr";
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
  const f = await p.evaluate((ROWSEL) => {
    const sheet = document.querySelector(".hero-sheet");
    if (!sheet) {
      return {
        rows: [],
        clipBottom: 0,
        headBottom: 0,
        sheetW: 0,
        vw: innerWidth,
        clipped: [],
        badgeCut: false,
        rowSpanOk: true,
      };
    }

    const hd = sheet.querySelector("thead, .hero-head, .hero-rows-head");
    const body = sheet.querySelector(".hero-rows");
    const clipEl = body || sheet.closest(".hero-sheet-wrap") || sheet;
    const head = hd
      ? hd.getBoundingClientRect()
      : body
        ? { bottom: body.getBoundingClientRect().top }
        : sheet.getBoundingClientRect();
    const clip = clipEl.getBoundingClientRect();
    const rows = [...sheet.querySelectorAll(ROWSEL)]
      .filter((tr) => !tr.closest(".hero-rows-ghost"))
      .map((tr) => {
        const r = tr.getBoundingClientRect();
        const o = +getComputedStyle(tr).opacity;
        return {
          id: (tr.cells ? tr.cells[0] : tr.firstElementChild)?.innerText.trim(),
          top: r.top,
          bottom: r.bottom,
          h: r.height,
          o,
        };
      })
      .filter((r) => r.o > 0.05 && r.bottom > head.bottom + 1 && r.top < clip.bottom - 1);

    const card = sheet.getBoundingClientRect();
    const textOver = (el, box) => {
      const rg = document.createRange();
      rg.selectNodeContents(el);
      const t = rg.getBoundingClientRect();
      return t.width > 0 && (t.right > box.right + 0.5 || t.left < box.left - 0.5);
    };
    const clipped = [];
    for (const c of sheet.querySelectorAll("th, td")) {
      if (c.closest(".hero-rows-ghost")) continue;
      const tr = c.closest("tr");
      if (tr && +getComputedStyle(tr).opacity <= 0.05) continue;
      const style = getComputedStyle(c);
      if (style.display === "none" || style.visibility === "hidden") continue;
      const cr = c.getBoundingClientRect();
      if (cr.width === 0 || cr.bottom < head.top || cr.top > clip.bottom) continue;
      const txt = c.innerText.trim();
      if (!txt) continue;
      if (c.scrollWidth > c.clientWidth + 1 || textOver(c, cr) || textOver(c, card)) {
        clipped.push(txt);
      }
    }
    const badge = document.querySelector(".hero-delta");
    let badgeCut = false;
    if (badge && badge.innerText.trim() && +getComputedStyle(badge).opacity > 0.05) {
      const br = badge.getBoundingClientRect();
      badgeCut =
        badge.scrollWidth > badge.clientWidth + 1 ||
        textOver(badge, card) ||
        br.right > card.right + 0.5;
    }

    // Live row lines should span the full card (no blank band from fixed td widths).
    let rowSpanOk = true;
    for (const tr of sheet.querySelectorAll("tbody.hero-rows tr, thead tr")) {
      if (tr.closest(".hero-rows-ghost")) continue;
      if (+getComputedStyle(tr).opacity <= 0.05) continue;
      const rr = tr.getBoundingClientRect();
      if (rr.width < 1) continue;
      if (Math.abs(rr.left - card.left) > 2 || Math.abs(rr.right - card.right) > 2) {
        rowSpanOk = false;
        break;
      }
    }

    return {
      rows: rows.filter((r) => r.top < clip.bottom - 1),
      clipBottom: clip.bottom,
      headBottom: head.bottom,
      sheetW: card.width,
      vw: innerWidth,
      clipped,
      badgeCut,
      rowSpanOk,
    };
  }, ROWSEL);

  const issues = [];
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
  if (f.vw >= 1024 && f.sheetW < 400) {
    issues.push(`narrow sheet ${f.sheetW.toFixed(0)}px at ${f.vw}`);
  }
  if (f.clipped.length) {
    issues.push("clipped " + [...new Set(f.clipped)].slice(0, 6).join("|"));
  }
  if (f.badgeCut) issues.push("badge cut");
  if (f.rowSpanOk === false) issues.push("row lines not full width");
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
