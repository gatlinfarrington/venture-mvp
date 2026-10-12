/**
 * blown-away-spec.md acceptance checks 2–5.
 * Usage: VIEWPORT_WIDTH=1280 node scripts/blown-away-accept.mjs [url]
 *
 * 2. Row insert, first digit move, and bar start within the same 100ms window.
 * 3. Final number equals START_MRR + Σ mrrDelta.
 * 4. No horizontal jiggle on .hero-mrr-num (±0.5px).
 * 5. Reduced motion: zero running animations on the hero after load.
 * 6. +$ chip never intersects MRR digits, table cells/headers, or the bar.
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
const FLY_MS = 900;
const START_DELAY_MS = 600;
// Match HeroDemo packetsAllowed (≥1120 shows the flying chip).
const packetsOn = WIDTH >= 1120;
const tickAtApprox =
  START_DELAY_MS + FIRST_TICK_INDEX * GAP_MS + (packetsOn ? FLY_MS : 0);

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
    // Prefer visible digit faces (crossfade); fall back to --v strip slots.
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

// —— Checks 2–4 (motion) ——
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
  // Wait for hydrated rows (lazy hero).
  await page.waitForSelector(
    "[data-hero-demo] .hero-sheet tr[data-row-id], [data-hero-demo] .hero-row",
    { timeout: 60_000 },
  );

  // Stabilize on START_MRR before measuring the beat (ignore SSR/hydrate snap).
  const startLabel = fmtMrr(START_MRR);
  await page.waitForFunction(
    (label) => {
      const el = document.querySelector("[data-hero-demo] .hero-mrr-num .sr-only");
      return el?.textContent?.trim() === label;
    },
    startLabel,
    { timeout: 60_000 },
  );
  // Two quiet frames at START so digit/bar baseline is post-hydrate.
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

  // Check 2: first tick landing — row / digit / bar start within 100ms
  const baseline = frames[0];
  let rowStart = null;
  let digitStart = null;
  let barStart = null;
  for (const f of frames) {
    if (rowStart == null && f.topId === FIRST_TICK_ID) rowStart = f.t;
    // Only count digit/bar moves at/after the tick row appears (same beat).
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

  // Continue sampling through end of landings for checks 3–4
  const loopEnd =
    START_DELAY_MS +
    landings.length * GAP_MS +
    (packetsOn ? FLY_MS : 0) +
    800;
  while (Date.now() - t0 < loopEnd) {
    const t = Date.now() - t0;
    const f = await sampleHero(page);
    frames.push({ t, ...f });
    await page.waitForTimeout(50);
  }

  // Check 3: final displayed MRR = START + Σ mrrDelta
  const expected = fmtMrr(START_MRR + SUM_DELTA);
  const continuumOk = Math.abs(START_MRR + SUM_DELTA - FINAL_MRR) < 0.01;
  const lastTexts = frames.slice(-10).map((f) => f.text);
  const sawFinal = lastTexts.includes(expected) || lastTexts.includes(fmtMrr(FINAL_MRR));
  // Prefer reading after landings settle (before reset): look for max mrr text
  const finalFrame = [...frames].reverse().find((f) => f.text === expected);
  results.checks[3] = {
    pass: continuumOk && Boolean(finalFrame || sawFinal),
    start: START_MRR,
    sumMrrDelta: SUM_DELTA,
    expected,
    finalMrr: FINAL_MRR,
    observed: finalFrame?.text || lastTexts.at(-1) || null,
  };

  // Check 4: .hero-mrr-num width stable ±0.5px while rolling
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

  // Check 6: +$ chip never intersects MRR digits or any table cell/header.
  // At <1120 the chip is hidden — treat as N/A pass.
  let chipHits = [];
  if (packetsOn) {
    const chipUntil =
      START_DELAY_MS + landings.length * GAP_MS + FLY_MS + 400;
    while (Date.now() - t0 < chipUntil) {
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
        const digits = [...(stage?.querySelectorAll(".hero-mrr-num .d, .hero-mrr-num .s") || [])];
        for (const el of digits) {
          if (overlaps(pr, el.getBoundingClientRect())) {
            return { kind: "digit", text: el.textContent?.trim() || "" };
          }
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
        return { kind: "clear" };
      });
      if (hit && hit.kind !== "clear") chipHits.push(hit);
      await page.waitForTimeout(40);
    }
  }
  results.checks[6] = {
    pass: chipHits.length === 0,
    packetsOn,
    hits: chipHits.slice(0, 8),
    note: "FAIL if packet bbox intersects digits, table cells, or bars",
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

await browser.close();

fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(results, null, 2));
const allPass = [2, 3, 4, 5, 6].every((k) => results.checks[k]?.pass);
console.log(JSON.stringify(results, null, 2));
console.log(allPass ? "RESULT: PASS" : "RESULT: FAIL");
process.exit(allPass ? 0 : 1);
