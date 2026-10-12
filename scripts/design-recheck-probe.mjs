/**
 * Probe leftover design defects on prod at one viewport.
 * Usage: VIEWPORT_WIDTH=1280 node scripts/design-recheck-probe.mjs [url]
 */
import { chromium } from "@playwright/test";
import fs from "node:fs";

const URL = process.argv[2] || "https://www.revenuesheet.app/";
const WIDTH = Number(process.env.VIEWPORT_WIDTH || 1280);
const HEIGHT = Number(process.env.VIEWPORT_HEIGHT || (WIDTH < 600 ? 812 : 900));
const OUT = process.env.OUT || `/tmp/design-recheck-${WIDTH}`;
fs.mkdirSync(OUT, { recursive: true });

const report = { url: URL, viewport: { width: WIDTH, height: HEIGHT }, defects: {} };

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const context = await browser.newContext({
  viewport: { width: WIDTH, height: HEIGHT },
  reducedMotion: "no-preference",
});
const page = await context.newPage();
await page.goto(URL, { waitUntil: "networkidle" });
report.sha = await page
  .evaluate(() =>
    fetch("/api/version")
      .then((r) => r.json())
      .then((j) => j.sha)
      .catch(() => "?"),
  )
  .catch(() => "?");

await page.waitForSelector("[data-hero-demo] .hero-sheet tr[data-row-id], [data-hero-demo] .hero-row", {
  timeout: 60_000,
});
await page.locator("[data-hero-demo]").first().scrollIntoViewIfNeeded();

// ——— 1. Reset flash: sample visible row count through first reset ———
{
  const frames = [];
  const t0 = Date.now();
  // Full loop ~600 + 14*1100 + 2400 + 720 ≈ 19s; sample 22s
  while (Date.now() - t0 < 22_000) {
    const t = Date.now() - t0;
    const f = await page.evaluate(() => {
      const sheet = document.querySelector("[data-hero-demo] .hero-sheet");
      const live =
        sheet?.querySelector(".hero-rows:not(.hero-rows-ghost)") ||
        sheet?.querySelector("tbody");
      const ghost = sheet?.querySelector(".hero-rows-ghost");
      const head = sheet?.querySelector("thead")?.getBoundingClientRect();
      const clip = (
        sheet?.querySelector(".hero-rows:not(.hero-rows-ghost)") ||
        sheet?.closest(".hero-sheet-wrap") ||
        sheet
      )?.getBoundingClientRect();
      const rows = [...(live?.querySelectorAll("tr[data-row-id], .hero-row") || [])]
        .map((tr) => {
          const r = tr.getBoundingClientRect();
          const o = +getComputedStyle(tr).opacity;
          const liveO = live ? +getComputedStyle(live).opacity : 1;
          return { o: o * liveO, top: r.top, bottom: r.bottom, h: r.height };
        })
        .filter(
          (r) =>
            r.o > 0.15 &&
            head &&
            clip &&
            r.bottom > head.bottom + 1 &&
            r.top < clip.bottom - 1,
        );
      const ghostO = ghost ? +getComputedStyle(ghost).opacity : 0;
      const ghostRows = ghost
        ? [...ghost.querySelectorAll("tr")].filter((tr) => {
            const o = +getComputedStyle(tr).opacity * ghostO;
            return o > 0.15;
          }).length
        : 0;
      const liveO = live ? +getComputedStyle(live).opacity : 1;
      return {
        visibleRows: rows.length,
        liveO,
        ghostO,
        ghostRows,
        covered: rows.length + (ghostO > 0.2 ? ghostRows : 0),
      };
    });
    frames.push({ t, ...f });
    await page.waitForTimeout(50);
  }
  // Empty flash: covered < 7 for ≥300ms consecutive
  let emptyRun = 0;
  let maxEmpty = 0;
  let emptyStart = null;
  const emptyWindows = [];
  for (const f of frames) {
    if (f.covered < 7) {
      if (emptyStart == null) emptyStart = f.t;
      emptyRun += 50;
      maxEmpty = Math.max(maxEmpty, emptyRun);
    } else {
      if (emptyRun >= 300) emptyWindows.push({ start: emptyStart, ms: emptyRun });
      emptyRun = 0;
      emptyStart = null;
    }
  }
  if (emptyRun >= 300) emptyWindows.push({ start: emptyStart, ms: emptyRun });
  report.defects.resetFlash = {
    fail: maxEmpty >= 300,
    maxEmptyMs: maxEmpty,
    emptyWindows,
    note: "FAIL if ≥300ms with <7 covered rows (live+ghost)",
  };
  fs.writeFileSync(`${OUT}/reset-frames.json`, JSON.stringify(frames, null, 2));
}

// ——— 2. Pro card -8px lift ———
{
  await page.goto(URL + "/#pricing", { waitUntil: "networkidle" }).catch(() => {});
  // Home page pricing section
  await page.goto(URL, { waitUntil: "networkidle" });
  const pricing = page.locator(".pricing-grid-reveal, .pricing-grid").first();
  if (await pricing.count()) {
    await pricing.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
  }
  const lift = await page.evaluate(() => {
    const card =
      document.querySelector(".pricing-grid .price-card.is-featured") ||
      document.querySelector(".price-card.is-featured");
    if (!card) return { found: false };
    const cs = getComputedStyle(card);
    const matrix = new DOMMatrixReadOnly(cs.transform);
    const reveal = card.closest(".pricing-grid-reveal");
    return {
      found: true,
      transform: cs.transform,
      translateY: matrix.m42,
      revealVisible: reveal?.classList.contains("is-visible") ?? null,
      width: window.innerWidth,
    };
  });
  const expectLift = WIDTH >= 1024;
  report.defects.proLift = {
    fail: expectLift ? !(lift.found && Math.abs(lift.translateY + 8) < 0.5) : false,
    skipped: !expectLift,
    ...lift,
    note: expectLift
      ? "FAIL if featured Pro translateY is not -8px at ≥1024"
      : "N/A below 1024",
  };
  if (lift.found) {
    await page.locator(".price-card.is-featured").first().screenshot({
      path: `${OUT}/pro-card.png`,
    });
  }
}

// ——— 3. Source-pill pulse ring ———
{
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-hero-demo] .hero-store", { timeout: 60_000 });
  await page.locator("[data-hero-demo]").first().scrollIntoViewIfNeeded();
  let peak = null;
  const t0 = Date.now();
  while (Date.now() - t0 < 12_000) {
    const s = await page.evaluate(() => {
      const pulsed = document.querySelector("[data-hero-demo] .hero-store.pulse");
      if (!pulsed) return null;
      const cs = getComputedStyle(pulsed);
      const st = pulsed.querySelector(".st");
      const stCs = st ? getComputedStyle(st) : null;
      const m = new DOMMatrixReadOnly(stCs?.transform || "none");
      const shadow = cs.boxShadow || "";
      const spreadMatch = shadow.match(/0px 0px 0px ([0-9.]+)px/);
      return {
        scale: m.a,
        shadow,
        spread: spreadMatch ? Number(spreadMatch[1]) : 0,
      };
    });
    if (s && (!peak || s.scale > peak.scale)) peak = s;
    if (peak && peak.scale >= 1.5 && peak.spread >= 0.9) break;
    await page.waitForTimeout(40);
  }
  report.defects.pulseRing = {
    fail: !peak || peak.scale < 1.5 || peak.spread < 0.9,
    peak,
    note: "FAIL unless pulse reaches ~1.6 scale and ≥0.9px ink ring",
  };
}

// ——— 4. Per-order bar growth readability ———
{
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-hero-demo] .hero-bars i.signal", { timeout: 60_000 });
  await page.locator("[data-hero-demo]").first().scrollIntoViewIfNeeded();
  // Settled per-order steps (wait out the height transition after each style change).
  await page.waitForFunction(() => {
    const t = document.querySelector("[data-hero-demo] .hero-mrr-num .sr-only")?.textContent;
    return t === "$4,374";
  });
  let lastStyle = null;
  let lastSettled = null;
  const settled = [];
  const t0 = Date.now();
  while (Date.now() - t0 < 16_000) {
    const s = await page.evaluate(() => {
      const sig = document.querySelector("[data-hero-demo] .hero-bars i.signal");
      return {
        style: sig?.style.height || "",
        h: sig ? sig.getBoundingClientRect().height : 0,
        mrr: document.querySelector("[data-hero-demo] .hero-mrr-num .sr-only")
          ?.textContent,
      };
    });
    if (s.style && s.style !== lastStyle) {
      await page.waitForTimeout(600);
      const s2 = await page.evaluate(() => {
        const sig = document.querySelector("[data-hero-demo] .hero-bars i.signal");
        return {
          style: sig?.style.height || "",
          h: sig ? sig.getBoundingClientRect().height : 0,
          mrr: document.querySelector("[data-hero-demo] .hero-mrr-num .sr-only")
            ?.textContent,
        };
      });
      if (lastSettled) {
        settled.push({
          from: lastSettled.mrr,
          to: s2.mrr,
          dH: s2.h - lastSettled.h,
        });
      }
      lastSettled = s2;
      lastStyle = s2.style;
    }
    await page.waitForTimeout(50);
  }
  const deltas = settled.map((s) => s.dH).filter((d) => d > 0.2);
  const minDelta = deltas.length ? Math.min(...deltas) : 0;
  report.defects.barGrowth = {
    fail: deltas.length < 3 || minDelta < 2.5,
    steps: deltas.length,
    minDeltaPx: minDelta,
    settled,
    note: "FAIL if <3 settled mrrDelta steps or any step < 2.5px",
  };
  fs.writeFileSync(`${OUT}/bar-heights.json`, JSON.stringify({ settled }, null, 2));
}

await browser.close();
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
const fails = Object.entries(report.defects).filter(([, d]) => d.fail);
console.log(fails.length ? `RESULT: FAIL (${fails.map(([k]) => k).join(", ")})` : "RESULT: PASS");
process.exit(fails.length ? 1 : 0);
