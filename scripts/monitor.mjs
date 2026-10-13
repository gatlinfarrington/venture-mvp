#!/usr/bin/env node
/**
 * Production health + link monitor for RevenueSheet.
 * - GET smoke checks on key routes (never POSTs /api/checkout).
 * - Crawls sitemap.xml + internal links on every blog post.
 * - Internal 4xx/5xx fail the run; external failures are warn-only (with retries).
 *
 * Usage: node scripts/monitor.mjs [BASE_URL]
 * Env: BASE_URL (default https://www.revenuesheet.app)
 * Exit: 0 = ok, 1 = failure. Writes JSON summary to stdout last line prefixed SUMMARY=
 */
import { writeFileSync } from "node:fs";

const BASE = (
  process.argv[2] ||
  process.env.BASE_URL ||
  "https://www.revenuesheet.app"
).replace(/\/+$/, "");

const HEALTH_PATHS = [
  "/",
  "/pricing",
  "/sample",
  "/blog",
  "/docs",
  "/changelog",
  "/api/version",
];

const UA = "RevenueSheet-monitor/1.0 (+https://github.com/gatlinfarrington/venture-mvp)";
const FETCH_TIMEOUT_MS = 20_000;
const EXTERNAL_RETRIES = 3;
const EXTERNAL_RETRY_MS = 1500;
const CONCURRENCY = 8;

/** Skip non-document / ephemeral Next assets when scanning page HTML. */
const SKIP_PATH_RE =
  /^\/_next\//i;
const SKIP_EXT_RE =
  /\.(?:css|js|mjs|map|woff2?|ttf|otf|eot|png|jpe?g|gif|webp|svg|ico|mp4|webm|pdf)(?:$|\?)/i;

const failures = [];
const warnings = [];

function log(msg) {
  console.log(msg);
}

function fail(msg) {
  failures.push(msg);
  console.error(`FAIL: ${msg}`);
}

function warn(msg) {
  warnings.push(msg);
  console.warn(`WARN: ${msg}`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchOnce(url, { method = "GET", accept } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const headers = { "User-Agent": UA, Accept: accept || "*/*" };
    const res = await fetch(url, {
      method,
      redirect: "follow",
      signal: ctrl.signal,
      headers,
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text, url: res.url };
  } finally {
    clearTimeout(t);
  }
}

function isInternal(url) {
  try {
    const u = new URL(url);
    const base = new URL(BASE);
    return u.origin === base.origin;
  } catch {
    return false;
  }
}

function shouldCheckPath(pathname) {
  if (SKIP_PATH_RE.test(pathname)) return false;
  if (SKIP_EXT_RE.test(pathname)) return false;
  return true;
}

function normalizeInternal(href, pageUrl) {
  if (!href || href.startsWith("mailto:") || href.startsWith("tel:")) return null;
  if (href.startsWith("javascript:") || href.startsWith("data:")) return null;
  // Decode HTML entities commonly left in Next output
  const cleaned = href.replace(/&amp;/g, "&").trim();
  if (!cleaned || cleaned === "#") return null;
  try {
    const abs = new URL(cleaned, pageUrl);
    if (abs.protocol !== "http:" && abs.protocol !== "https:") return null;
    // Drop hash-only navigation noise for status checks
    abs.hash = "";
    if (!shouldCheckPath(abs.pathname)) return null;
    return abs.toString();
  } catch {
    return null;
  }
}

async function checkHealth() {
  log(`→ Health checks against ${BASE}`);
  for (const path of HEALTH_PATHS) {
    const url = `${BASE}${path}`;
    try {
      const res = await fetchOnce(url, {
        accept: path === "/api/version" ? "application/json" : "text/html,*/*",
      });
      if (res.status !== 200) {
        fail(`${path} → HTTP ${res.status}`);
        continue;
      }
      if (path === "/api/version") {
        let json;
        try {
          json = JSON.parse(res.text);
        } catch {
          fail(`/api/version → body is not JSON`);
          continue;
        }
        const sha = String(json.sha || json.commit || "").trim();
        if (!sha || sha === "unknown") {
          fail(`/api/version → missing usable sha (got ${JSON.stringify(json)})`);
          continue;
        }
        log(`✓ ${path} (200, sha=${sha.slice(0, 12)}…)`);
      } else {
        log(`✓ ${path} (200)`);
      }
    } catch (err) {
      fail(`${path} → ${err.name || "Error"}: ${err.message}`);
    }
  }
}

async function fetchSitemapUrls() {
  const sitemapUrl = `${BASE}/sitemap.xml`;
  const res = await fetchOnce(sitemapUrl, { accept: "application/xml,text/xml,*/*" });
  if (res.status !== 200) {
    fail(`/sitemap.xml → HTTP ${res.status}`);
    return [];
  }
  const locs = [...res.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  if (locs.length === 0) {
    fail(`/sitemap.xml → no <loc> entries`);
    return [];
  }
  log(`✓ sitemap.xml (${locs.length} URLs)`);
  return locs;
}

function extractHrefs(html) {
  return [...html.matchAll(/\bhref\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);
}

async function collectBlogLinks(sitemapUrls) {
  const blogPosts = sitemapUrls.filter((u) => {
    try {
      const p = new URL(u).pathname;
      return p.startsWith("/blog/") && p !== "/blog/";
    } catch {
      return false;
    }
  });

  const internal = new Set();
  const external = new Set();
  log(`→ Crawling ${blogPosts.length} blog posts for links`);

  await mapPool(blogPosts, CONCURRENCY, async (postUrl) => {
    try {
      const res = await fetchOnce(postUrl, { accept: "text/html,*/*" });
      if (res.status !== 200) {
        fail(`blog crawl ${postUrl} → HTTP ${res.status}`);
        return;
      }
      for (const href of extractHrefs(res.text)) {
        const abs = normalizeInternal(href, postUrl);
        if (!abs) continue;
        if (isInternal(abs)) internal.add(abs);
        else external.add(abs);
      }
    } catch (err) {
      fail(`blog crawl ${postUrl} → ${err.message}`);
    }
  });

  log(
    `✓ blog links: ${internal.size} internal (fail on 4xx/5xx), ${external.size} external (warn-only)`,
  );
  return { internal: [...internal], external: [...external] };
}

async function mapPool(items, limit, fn) {
  const q = [...items];
  const workers = Array.from({ length: Math.min(limit, items.length || 1) }, async () => {
    while (q.length) {
      const item = q.shift();
      // eslint-disable-next-line no-await-in-loop
      await fn(item);
    }
  });
  await Promise.all(workers);
}

async function checkUrl(url, { external }) {
  const attempts = external ? EXTERNAL_RETRIES : 1;
  let lastErr = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetchOnce(url);
      if (res.status >= 400) {
        lastErr = `HTTP ${res.status}`;
        if (external && i < attempts - 1) {
          await sleep(EXTERNAL_RETRY_MS * (i + 1));
          continue;
        }
        return { ok: false, detail: lastErr };
      }
      return { ok: true, detail: `HTTP ${res.status}` };
    } catch (err) {
      lastErr = `${err.name || "Error"}: ${err.message}`;
      if (external && i < attempts - 1) {
        await sleep(EXTERNAL_RETRY_MS * (i + 1));
        continue;
      }
      return { ok: false, detail: lastErr };
    }
  }
  return { ok: false, detail: lastErr || "unknown" };
}

async function checkLinks(urls) {
  const unique = [...new Set(urls.map((u) => {
    try {
      const x = new URL(u);
      x.hash = "";
      return x.toString();
    } catch {
      return u;
    }
  }))];

  const internal = unique.filter(isInternal);
  const external = unique.filter((u) => !isInternal(u));

  log(`→ Checking ${internal.length} internal + ${external.length} external links`);

  await mapPool(internal, CONCURRENCY, async (url) => {
    const r = await checkUrl(url, { external: false });
    if (!r.ok) fail(`internal ${url} → ${r.detail}`);
  });

  await mapPool(external, CONCURRENCY, async (url) => {
    const r = await checkUrl(url, { external: true });
    if (!r.ok) warn(`external ${url} → ${r.detail}`);
  });
}

async function main() {
  log(`RevenueSheet monitor — ${new Date().toISOString()}`);
  log(`Base: ${BASE}`);

  await checkHealth();

  const sitemapUrls = await fetchSitemapUrls();
  const blog = sitemapUrls.length
    ? await collectBlogLinks(sitemapUrls)
    : { internal: [], external: [] };

  // Sitemap + blog links (deduped in checkLinks). Internal fails; external warns.
  await checkLinks([...sitemapUrls, ...blog.internal, ...blog.external]);

  const summary = {
    ok: failures.length === 0,
    base: BASE,
    failureCount: failures.length,
    warningCount: warnings.length,
    failures,
    warnings,
  };

  const summaryPath = process.env.MONITOR_SUMMARY_PATH || "monitor-summary.json";
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  log(`SUMMARY=${JSON.stringify(summary)}`);

  if (failures.length) {
    console.error(`\n${failures.length} failure(s). See ${summaryPath}.`);
    process.exit(1);
  }
  log(`\nAll checks passed (${warnings.length} external warning(s)).`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  const summary = {
    ok: false,
    base: BASE,
    failureCount: 1,
    warningCount: 0,
    failures: [String(err?.stack || err)],
    warnings: [],
  };
  try {
    writeFileSync(
      process.env.MONITOR_SUMMARY_PATH || "monitor-summary.json",
      JSON.stringify(summary, null, 2),
    );
  } catch {
    /* ignore */
  }
  process.exit(1);
});
