/**
 * blown-away-spec.md acceptance checks 2–8.
 * Usage: VIEWPORT_WIDTH=1280 node scripts/blown-away-accept.mjs [url]
 *
 * 2. Row insert, first digit move, and bar start within the same 100ms window.
 * 3. Final number equals START_MRR + Σ mrrDelta.
 * 4. No horizontal jiggle on .hero-mrr-num (±0.5px).
 * 5. Reduced motion: zero running animations on the hero after load.
 * 6. +$ chip never intersects table cells/headers or the bar; stays in MRR card.
 *    Samples the whole chip lifetime (not only rest state).
 * 7. Every th/td lies within the sheet card bounds; row lines span the full card.
 * 8. Sheet ≥400px at 1024+; no clipped cells or badge (match hero-loop-test).
 */
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const data = require("../lib/sample-dataset/sample-dataset.json");

const URL = process.argv[2] || "https://www.revenuesheet.app/";
const WIDTH = Number(process.env.VIEWPORT_WIDTH || process.env.WIDTH || 1280);
const HEIGHT = Number(process.env.VIEWPORT_HEIGHT || (WIDTH < 600 ? 812 : 900));
const OUT = process.env.OUT || `/tmp/blown-away-${WIDTH}`;
fs.mkdirSync(OUT, { recursive: true });

const START_MRR = data.hero.startMrr;
const FINAL_MRR = data.hero.finalMrr;
const landings = data.hero.landingIds.map((id) => {
  const o = data.orders.find((x) => x.id === id);
  if (!o) throw new Error(`missing order ${id}`);
  return o;
});
const SUM_DELTA = landings.reduce((s, o) => s + (o.mrrDelta || 0), 0);
const FIRST_TICK_INDEX = landings.findIndex((o) => (o.mrrDelta || 0) > 0);
const FIRST_TICK_ID = landings[FIRST_TICK_INDEX]?.id;

const GAP_MS = 1100;
const CHIP_MS = 420;
const CHIP_HOLD_MS = 720;
const START_DELAY_MS = 600;
// Match HeroDemo chipsAllowed (≥1120 shows the +$ chip below the number).
const packetsOn = WIDTH >= 1120;
const tickAtApprox = START_DELAY_MS + FIRST_TICK_INDEX * GAP_MS;

function fmtMrr(n) {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

const results = {
  url: URL,
  viewport: { width: WIDTH, height: HEIGHT },
  checks: {},
};

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ["--no-sandbox"],
});

async function sampleHero(page) {
  return page.evaluate(() => {
    const stage = document.querySelector("[data-hero-demo]");
    const num = stage?.querySelector(".hero-mrr-num");
    const signal = stage?.querySelector(".hero-bars i.signal");
    const liveBody =
      stage?.querySelector(".hero-rows:not(.hero-rows-ghost)") ||
      stage?.querySelector("tbody");
    const top = liveBody?.querySelector("tr[data-row-id], .hero-row");
    const digits = num
      ? [...num.querySelectorAll(".d")].map((d) => {
          const face = d.querySelector(".d-face");
          if (face?.textContent != null && face.textContent !== "") {
            return face.textContent.trim();
          }
          return getComputedStyle(d).getPropertyValue("--v").trim();
        })
      : [];
    const barH = signal ? signal.getBoundingClientRect().height : 0;
    const barStyleH = signal ? signal.style.height : "";
    const numW = num ? num.getBoundingClientRect().width : 0;
    const text = num?.querySelector(".sr-only")?.textContent?.trim() || "";
    const topId =
      top?.getAttribute("data-row-id") ||
      top?.dataset?.rowId ||
      top?.querySelector("td")?.textContent?.trim() ||
      "";
    return { topId, digits: digits.join(""), barH, barStyleH, numW, text };
  });
}

async function measureCellBounds(page) {
  return page.evaluate(() => {
    const sheet = document.querySelector("[data-hero-demo] .hero-sheet");
    if (!sheet) {
      return {
        ok: false,
        reason: "no-sheet",
        sheetWidth: 0,
        overflows: [],
        clipped: [],
        badgeCut: false,
        rowSpanOk: false,
      };
    }
    const card = sheet.getBoundingClientRect();
    const textOver = (el, box) => {
      const rg = document.createRange();
      rg.selectNodeContents(el);
      const t = rg.getBoundingClientRect();
      return t.width > 0 && (t.right > box.right + 0.5 || t.left < box.left - 0.5);
    };
    const cells = [...sheet.querySelectorAll("th, td")];
    const inset = 0.5;
    const overflows = [];
    const clipped = [];
    for (const el of cells) {
      if (el.closest(".hero-rows-ghost")) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      if (
        r.left < card.left - inset ||
        r.right > card.right + inset ||
        r.top < card.top - inset ||
        r.bottom > card.bottom + inset
      ) {
        overflows.push({
          text: (el.textContent || "").trim().slice(0, 28),
          dxL: +(r.left - card.left).toFixed(1),
          dxR: +(r.right - card.right).toFixed(1),
          dyT: +(r.top - card.top).toFixed(1),
          dyB: +(r.bottom - card.bottom).toFixed(1),
        });
      }
      const txt = (el.textContent || "").trim();
      if (
        txt &&
        (el.scrollWidth > el.clientWidth + 1 || textOver(el, r) || textOver(el, card))
      ) {
        clipped.push({
          text: txt.slice(0, 28),
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
        });
      }
    }
    const badge = document.querySelector("[data-hero-demo] .hero-delta");
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
    return {
      ok:
        overflows.length === 0 &&
        clipped.length === 0 &&
        !badgeCut &&
        rowSpanOk,
      sheetWidth: +card.width.toFixed(1),
      overflows: overflows.slice(0, 12),
      clipped: clipped.slice(0, 12),
      badgeCut,
      rowSpanOk,
    };
  });
}

// —— Checks 2–4, 6 (motion at primary WIDTH) ——
{
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  await page.goto(URL, { waitUntil: "networkidle" });
  const sha = await page
    .evaluate(() =>
      fetch("/api/version")
        .then((r) => r.json())
        .then((j) => j.sha)
        .catch(() => "?"),
    )
    .catch(() => "?");
  results.sha = sha;

  await page.waitForSelector("[data-hero-demo] .hero-sheet", { timeout: 60_000 });
  await page.locator("[data-hero-demo]").first().scrollIntoViewIfNeeded();
  await page.waitForSelector(
    "[data-hero-demo] .hero-sheet tr[data-row-id], [data-hero-demo] .hero-row",
    { timeout: 60_000 },
  );

  const startLabel = fmtMrr(START_MRR);
  await page.waitForFunction(
    (label) => {
      const el = document.querySelector("[data-hero-demo] .hero-mrr-num .sr-only");
      return el?.textContent?.trim() === label;
    },
    startLabel,
    { timeout: 60_000 },
  );
  let quiet = await sampleHero(page);
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(50);
    const next = await sampleHero(page);
    if (
      next.text === startLabel &&
      next.digits === quiet.digits &&
      Math.abs(next.barH - quiet.barH) < 0.4
    ) {
      quiet = next;
      break;
    }
    quiet = next;
  }

  const t0 = Date.now();
  const frames = [{ t: 0, ...quiet }];
  const sampleUntil = tickAtApprox + 2500;
  while (Date.now() - t0 < sampleUntil) {
    const t = Date.now() - t0;
    const f = await sampleHero(page);
    frames.push({ t, ...f });
    await page.waitForTimeout(50);
  }

  const baseline = frames[0];
  let rowStart = null;
  let digitStart = null;
  let barStart = null;
  for (const f of frames) {
    if (rowStart == null && f.topId === FIRST_TICK_ID) rowStart = f.t;
    if (rowStart != null) {
      if (digitStart == null && f.digits !== baseline.digits) digitStart = f.t;
      if (
        barStart == null &&
        (Math.abs(f.barH - baseline.barH) > 0.4 || f.barStyleH !== baseline.barStyleH)
      ) {
        barStart = f.t;
      }
    }
  }
  const starts = [rowStart, digitStart, barStart];
  const check2Ok =
    starts.every((x) => typeof x === "number") &&
    Math.max(...starts) - Math.min(...starts) <= 100;
  results.checks[2] = {
    pass: check2Ok,
    firstTickId: FIRST_TICK_ID,
    rowStart,
    digitStart,
    barStart,
    windowMs:
      starts.every((x) => typeof x === "number")
        ? Math.max(...starts) - Math.min(...starts)
        : null,
  };

  const loopEnd = START_DELAY_MS + landings.length * GAP_MS + CHIP_MS + CHIP_HOLD_MS + 400;
  // Check 6 samples continuously through every chip's full lifetime.
  let chipHits = [];
  let chipSamples = 0;
  while (Date.now() - t0 < loopEnd) {
    const t = Date.now() - t0;
    const f = await sampleHero(page);
    frames.push({ t, ...f });

    if (packetsOn) {
      const hit = await page.evaluate(() => {
        const stage = document.querySelector("[data-hero-demo]");
        const packet = stage?.querySelector("[data-hero-packet]");
        if (!packet) return null;
        const o = +getComputedStyle(packet).opacity;
        if (o < 0.15) return null;
        const pr = packet.getBoundingClientRect();
        if (pr.width < 1 || pr.height < 1) return null;
        const overlaps = (a, b) =>
          !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
        const num = stage?.querySelector(".hero-mrr-num");
        const numRect = num?.getBoundingClientRect();
        // Chip must sit below the number (never across digits).
        if (numRect && pr.top < numRect.bottom - 1) {
          return { kind: "over-digits", text: `top=${(pr.top - numRect.bottom).toFixed(1)}` };
        }
        const delta = stage?.querySelector(".hero-delta");
        if (delta && overlaps(pr, delta.getBoundingClientRect())) {
          return { kind: "delta", text: (delta.textContent || "").trim() };
        }
        const cells = [
          ...(stage?.querySelectorAll(".hero-sheet th, .hero-sheet td") || []),
        ];
        for (const el of cells) {
          if (overlaps(pr, el.getBoundingClientRect())) {
            return {
              kind: "cell",
              text: (el.textContent || "").trim().slice(0, 24),
            };
          }
        }
        const bars = stage?.querySelector(".hero-bars");
        if (bars && overlaps(pr, bars.getBoundingClientRect())) {
          return { kind: "bar", text: "hero-bars" };
        }
        const card = stage?.querySelector(".hero-sheet-top");
        if (card) {
          const cr = card.getBoundingClientRect();
          const inset = 1;
          if (
            pr.left < cr.left - inset ||
            pr.right > cr.right + inset ||
            pr.top < cr.top - inset ||
            pr.bottom > cr.bottom + inset
          ) {
            return {
              kind: "outside-card",
              text: `dx=${(pr.left - cr.left).toFixed(1)},dy=${(pr.top - cr.top).toFixed(1)}`,
            };
          }
        }
        const mrr = stage?.querySelector(".hero-mrr");
        if (mrr && !mrr.contains(packet)) {
          return { kind: "not-in-mrr", text: "chip outside .hero-mrr" };
        }
        return { kind: "clear" };
      });
      if (hit) {
        chipSamples += 1;
        if (hit.kind !== "clear") chipHits.push({ ...hit, t });
      }
    }
    await page.waitForTimeout(40);
  }

  const expected = fmtMrr(START_MRR + SUM_DELTA);
  const continuumOk = Math.abs(START_MRR + SUM_DELTA - FINAL_MRR) < 0.01;
  const lastTexts = frames.slice(-10).map((f) => f.text);
  const sawFinal = lastTexts.includes(expected) || lastTexts.includes(fmtMrr(FINAL_MRR));
  const finalFrame = [...frames].reverse().find((f) => f.text === expected);
  results.checks[3] = {
    pass: continuumOk && Boolean(finalFrame || sawFinal),
    start: START_MRR,
    sumMrrDelta: SUM_DELTA,
    expected,
    finalMrr: FINAL_MRR,
    observed: finalFrame?.text || lastTexts.at(-1) || null,
  };

  const widths = frames.map((f) => f.numW).filter((w) => w > 0);
  const wMin = Math.min(...widths);
  const wMax = Math.max(...widths);
  const jiggle = wMax - wMin;
  results.checks[4] = {
    pass: jiggle <= 0.5,
    widthMin: wMin,
    widthMax: wMax,
    jigglePx: jiggle,
  };

  results.checks[6] = {
    pass: !packetsOn || (chipHits.length === 0 && chipSamples > 0),
    packetsOn,
    chipSamples,
    hits: chipHits.slice(0, 8),
    note: "FAIL if chip hits cells/bars, leaves the MRR card, or is never sampled while visible",
  };

  fs.writeFileSync(path.join(OUT, "frames.json"), JSON.stringify(frames, null, 2));
  await context.close();
}

// —— Check 5: reduced motion ——
{
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-hero-demo] .hero-sheet", { timeout: 60_000 });
  await page.locator("[data-hero-demo]").first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  const anim = await page.evaluate(() => {
    const stage = document.querySelector("[data-hero-demo]");
    if (!stage) return { count: -1, names: [] };
    const running = stage
      .getAnimations({ subtree: true })
      .filter((a) => a.playState === "running");
    return {
      count: running.length,
      names: running.map((a) => a.animationName || a.transitionProperty || a.id || "?"),
    };
  });
  results.checks[5] = {
    pass: anim.count === 0,
    running: anim.count,
    names: anim.names,
  };
  await context.close();
}

// —— Check 7/8 (match hero-loop-test): sheet ≥400px at 1024+, no clipped
// cells/badge, row lines span the full card ——
{
  const BOUND_WIDTHS = [1440, 1280, 1024, 768, 375];
  const byWidth = {};
  let boundsOk = true;
  let widthOk = true;
  let clipOk = true;
  let badgeOk = true;
  let rowSpanOk = true;
  for (const w of BOUND_WIDTHS) {
    const h = w < 600 ? 812 : 900;
    const context = await browser.newContext({
      viewport: { width: w, height: h },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await page.goto(URL, { waitUntil: "networkidle" });
    await page.waitForSelector("[data-hero-demo] .hero-sheet", { timeout: 60_000 });
    await page.locator("[data-hero-demo]").first().scrollIntoViewIfNeeded();
    await page.waitForSelector(
      "[data-hero-demo] .hero-sheet tr[data-row-id], [data-hero-demo] .hero-row, [data-hero-demo] .hero-sheet td",
      { timeout: 60_000 },
    );
    await page.waitForTimeout(200);
    const measured = await measureCellBounds(page);
    byWidth[w] = measured;
    if (measured.overflows?.length) boundsOk = false;
    if (measured.clipped?.length) clipOk = false;
    if (measured.badgeCut) badgeOk = false;
    if (measured.rowSpanOk === false) rowSpanOk = false;
    if (w >= 1024 && measured.sheetWidth < 400) widthOk = false;
    await context.close();
  }
  results.checks[7] = {
    pass: boundsOk && rowSpanOk,
    byWidth,
    note: "FAIL if any th/td extends past .hero-sheet or row lines do not span the card",
  };
  results.checks[8] = {
    pass: widthOk && clipOk && badgeOk,
    byWidth: Object.fromEntries(
      Object.entries(byWidth).map(([w, m]) => [
        w,
        {
          sheetWidth: m.sheetWidth,
          clipped: m.clipped,
          badgeCut: m.badgeCut,
          rowSpanOk: m.rowSpanOk,
        },
      ]),
    ),
    note: "FAIL if sheet < 400px at 1024+, any cell/badge clipped, or row lines truncated",
  };
}

await browser.close();

fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(results, null, 2));
const allPass = [2, 3, 4, 5, 6, 7, 8].every((k) => results.checks[k]?.pass);
console.log(JSON.stringify(results, null, 2));
console.log(allPass ? "RESULT: PASS" : "RESULT: FAIL");
process.exit(allPass ? 0 : 1);
