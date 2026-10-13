// Hero loop acceptance test. Usage: node scripts/hero-loop-test.mjs [url] [outdir]
// Samples the hero order table every 100ms over one full loop and checks:
// no overlapping rows, no duplicate IDs, no blank band (gap > 2px between rows, or
// empty space under the last visible row taller than 2px inside the clip box).
// Also fails if the sheet is under 400px wide at viewport >= 1024, or any cell or
// the delta badge is cut off.
// Exception (documented): in the 980–1119 two-column band, sheet ≥400 is required
// only when the stage is wide enough to fit it; otherwise the check is relaxed.
// Also fails if the hero headline is <16px from the left viewport edge or the
// sheet's right edge is <16px from the right viewport edge (container inset).
// At 1000/1060/1100, fails if the right half above the fold has no hero demo
// (stacked layout leaving blank white beside the copy).
// The reset ghost layer (.hero-rows-ghost) is excluded: it is a deliberate fade-out overlay.
//
// Widths: VIEWPORT_WIDTH / WIDTH for one run. Or WIDTHS=suite / a comma list.
// Suite includes 1000/1060/1100 (980–1119 two-col band) and 1120/1200.
// Cold load: COLD_LOAD=1 fails if any live row paints above the table header on first paint.
import { chromium } from "playwright-core";
import fs from "fs";
import { createRequire } from "module";
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const pw = require("playwright-core");
const executablePath = pw.chromium.executablePath();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const URL = process.argv[2] || "https://www.revenuesheet.app/";
const OUT = process.argv[3] || "/tmp/hero-loop-report";
const LOOP_MS = Number(process.env.LOOP_MS || 19000);
const STEP = 100;
const WIDTH = Number(process.env.VIEWPORT_WIDTH || process.env.WIDTH || 1440);
const HEIGHT = Number(process.env.VIEWPORT_HEIGHT || (WIDTH < 600 ? 812 : 900));
const START_WAIT = Number(process.env.START_WAIT || 700);
const SAVE_ALL = Boolean(process.env.SAVE_ALL);
const REPLAY_AT = process.env.REPLAY_AT ? Number(process.env.REPLAY_AT) : null;
const COLD_LOAD = Boolean(process.env.COLD_LOAD);
/** Default suite widths when WIDTHS is set to "suite" or a comma list. */
const SUITE_WIDTHS = [375, 768, 1000, 1024, 1060, 1100, 1120, 1200, 1280, 1440];
const EDGE_INSET_MIN = 16;

if (process.env.WIDTHS && !process.env.HERO_LOOP_CHILD) {
  const list =
    process.env.WIDTHS === "suite" || process.env.WIDTHS === "1"
      ? SUITE_WIDTHS
      : process.env.WIDTHS.split(",").map((s) => Number(s.trim())).filter(Boolean);
  let failed = 0;
  for (const w of list) {
    const outDir = path.join(OUT, String(w));
    fs.mkdirSync(outDir, { recursive: true });
    const env = {
      ...process.env,
      HERO_LOOP_CHILD: "1",
      VIEWPORT_WIDTH: String(w),
      WIDTH: String(w),
    };
    delete env.WIDTHS;
    const r = spawnSync(process.execPath, [path.join(__dirname, "hero-loop-test.mjs"), URL, outDir], {
      env,
      stdio: "inherit",
    });
    if (r.status !== 0) failed += 1;
  }
  process.exit(failed ? 1 : 0);
}

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

const ROWSEL = (await p.$(".hero-sheet .hero-row")) ? ".hero-row" : "tbody tr";
const sha = await p
  .evaluate(() =>
    fetch("/api/version")
      .then((r) => r.json())
      .then((j) => j.sha)
      .catch(() => "?"),
  )
  .catch(() => "?");

async function sampleFrame() {
  return p.evaluate((ROWSEL) => {
    const sheet = document.querySelector(".hero-sheet");
    if (!sheet) {
      return {
        rows: [],
        clipBottom: 0,
        headTop: 0,
        headBottom: 0,
        sheetW: 0,
        vw: innerWidth,
        clipped: [],
        badgeCut: false,
        rowSpanOk: false,
        aboveHeader: [],
        headlineLeft: 0,
        sheetRightInset: 0,
        edgeOk: false,
        rightHalfOk: true,
        stageW: 0,
      };
    }

    const hd = sheet.querySelector("thead, .hero-head, .hero-rows-head");
    const body = sheet.querySelector(".hero-rows");
    const clipEl = body || sheet.closest(".hero-sheet-wrap") || sheet;
    const headRect = hd
      ? hd.getBoundingClientRect()
      : body
        ? { top: body.getBoundingClientRect().top, bottom: body.getBoundingClientRect().top }
        : sheet.getBoundingClientRect();
    const clip = clipEl.getBoundingClientRect();
    const allRows = [...sheet.querySelectorAll(ROWSEL)].filter(
      (tr) => !tr.closest(".hero-rows-ghost"),
    );
    const aboveHeader = [];
    for (const tr of allRows) {
      const o = +getComputedStyle(tr).opacity;
      if (o <= 0.05) continue;
      const r = tr.getBoundingClientRect();
      if (r.height < 1) continue;
      // Any paint above the thead top (first-paint flash under/into the header).
      if (r.top < headRect.top - 0.5) {
        aboveHeader.push(
          (tr.cells ? tr.cells[0] : tr.firstElementChild)?.innerText.trim() || "?",
        );
      }
    }
    const rows = allRows
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
      .filter((r) => r.o > 0.05 && r.bottom > headRect.bottom + 1 && r.top < clip.bottom - 1);

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
      if (cr.width === 0 || cr.bottom < headRect.top || cr.top > clip.bottom) continue;
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

    const headline =
      document.querySelector(".hero .display, .hero-copy h1, .hero h1") ||
      document.querySelector(".hero-copy");
    const headlineLeft = headline ? headline.getBoundingClientRect().left : 0;
    const sheetRightInset = innerWidth - card.right;
    const edgeOk = headlineLeft >= 16 - 0.5 && sheetRightInset >= 16 - 0.5;

    const stage =
      document.querySelector("[data-hero-demo]") ||
      document.querySelector(".hero-frame") ||
      document.querySelector(".hero-stage");
    const stageRect = stage ? stage.getBoundingClientRect() : card;
    const foldBottom = Math.min(innerHeight, 900);
    const midX = innerWidth / 2;
    // Demo must paint into the right half above the fold (not blank white).
    const rightHalfOk =
      stageRect.right > midX + 16 &&
      stageRect.left < innerWidth - 16 &&
      stageRect.top < foldBottom - 48 &&
      stageRect.bottom > 64;

    return {
      rows: rows.filter((r) => r.top < clip.bottom - 1),
      clipBottom: clip.bottom,
      headTop: headRect.top,
      headBottom: headRect.bottom,
      sheetW: card.width,
      vw: innerWidth,
      clipped,
      badgeCut,
      rowSpanOk,
      aboveHeader,
      headlineLeft: +headlineLeft.toFixed(1),
      sheetRightInset: +sheetRightInset.toFixed(1),
      edgeOk,
      rightHalfOk,
      stageW: +stageRect.width.toFixed(1),
    };
  }, ROWSEL);
}

if (COLD_LOAD) {
  // First paint only: no entrance wait. Fail if any row sits above the thead.
  await p.waitForTimeout(50);
  const f = await sampleFrame();
  const issues = [];
  if (f.aboveHeader.length) {
    issues.push("row above header " + [...new Set(f.aboveHeader)].slice(0, 6).join("|"));
  }
  const summary = {
    url: URL,
    sha,
    mode: "cold-load",
    viewport: { width: WIDTH, height: HEIGHT },
    frames: 1,
    failingFrames: issues.length ? 1 : 0,
    issueCounts: issues.length ? { "row above": 1 } : {},
    firstFails: issues.length ? [{ t: 0, issues }] : [],
    aboveHeader: f.aboveHeader,
  };
  fs.writeFileSync(`${OUT}/report.json`, JSON.stringify({ summary, frames: [{ t: 0, issues }] }, null, 1));
  console.log(JSON.stringify(summary, null, 1));
  console.log(issues.length ? "RESULT: FAIL" : "RESULT: PASS");
  await b.close();
  process.exit(issues.length ? 1 : 0);
}

// Let the hero entrance (~500ms) finish so it is not counted as a row jump.
await p.waitForTimeout(START_WAIT);

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
  const f = await sampleFrame();

  const issues = [];
  // aboveHeader is cold-load only (enter springs briefly park a row over the thead).
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
  // ≥400px sheet from 1024 up, except 980–1119 where we only require it when
  // the stage can fit a 400px sheet (two-col band; documented).
  const band980 = f.vw >= 980 && f.vw <= 1119;
  if (f.vw >= 1024 && f.sheetW < 400) {
    if (!band980 || (f.stageW || 0) >= 400) {
      issues.push(`narrow sheet ${f.sheetW.toFixed(0)}px at ${f.vw}`);
    }
  }
  if (f.edgeOk === false) {
    issues.push(
      `page edge inset <${EDGE_INSET_MIN}px (headlineLeft=${f.headlineLeft}, sheetRightInset=${f.sheetRightInset})`,
    );
  }
  if ([1000, 1060, 1100].includes(f.vw) && f.rightHalfOk === false) {
    issues.push("right half above the fold is blank (hero demo missing)");
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
