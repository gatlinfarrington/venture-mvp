#!/usr/bin/env node
/**
 * RevenueSheet design CI — LANDING.md A1–A18 companion to stylelint.
 *
 * Fails on:
 * - linear/radial/conic gradients or glow-like text-shadow/box-shadow (outside exceptions)
 * - dark page backgrounds on html/body
 * - --c-dark-bg or backgrounds darker than #e5e5e5 outside buttons
 * - hex/rgb/hsl colors outside design/tokens.css
 * - raw px font-size / spacing outside token files
 * - emoji in UI strings or JSX
 * - text/background token pairs below WCAG AA
 *
 * Explicit exceptions: same-line or previous-line comment containing
 *   design-exception: <rule-id> <reason>
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TOKENS_PATH = path.join(ROOT, "design/tokens.css");
const SCAN_DIRS = ["app", "components"];
const TOKEN_FILES = new Set([
  path.normalize("design/tokens.css"),
  path.normalize("design/tokens.json"),
]);

const EXCEPTION_RE = /design-exception:\s*([A-Za-z0-9_-]+)/i;
const GRADIENT_RE =
  /\b(linear-gradient|radial-gradient|conic-gradient|repeating-linear-gradient|repeating-radial-gradient)\s*\(/gi;
const GLOW_SHADOW_RE =
  /(?:text-shadow|box-shadow)\s*:[^;]*(?:0\s+0\s+(?:[8-9]|\d{2,})px|[0-9]+px\s+[0-9]+px\s+(?:[2-9]\d|\d{3,})px)/gi;
const HEX_RE = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;
const RGB_HSL_RE = /\b(?:rgb|rgba|hsl|hsla)\s*\(/gi;
const FONT_SIZE_PX_RE = /font-size\s*:\s*[0-9.]+px/gi;
// Only true spacing props (not border-bottom / outline-left false positives).
const SPACING_PX_RE =
  /(?:^|[;{])\s*(?:margin|padding|gap|row-gap|column-gap|top|right|bottom|left|inset)(?:-(?:top|right|bottom|left|inline|block|start|end|x|y))?\s*:\s*[^;]*[0-9.]+px/gim;
const DARK_PAGE_RE =
  /(?:html|body)[^{]*\{[^}]*(?:background(?:-color)?)\s*:\s*(?:#0a0a0b|var\(\s*--c-dark-bg)/gis;
const EMOJI_RE =
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{1F1E6}-\u{1F1FF}]/gu;

/** Text/background pairs that must meet WCAG AA (4.5:1 text, 3:1 UI large). */
const CONTRAST_PAIRS = [
  { fg: "--c-ink", bg: "--c-bg", min: 4.5, role: "Body text" },
  { fg: "--c-ink-muted", bg: "--c-bg", min: 4.5, role: "Secondary text" },
  { fg: "--c-ink-muted", bg: "--c-surface-2", min: 4.5, role: "Muted on header band" },
  { fg: "--c-ink", bg: "--c-surface-2", min: 4.5, role: "Header text on band" },
  { fg: "--c-ink-inverse", bg: "--c-ink", min: 4.5, role: "Primary button" },
  { fg: "--c-ink-inverse", bg: "--c-signal", min: 4.5, role: "Signal button" },
  { fg: "--c-signal", bg: "--c-bg", min: 4.5, role: "Positive delta text" },
  { fg: "--c-signal", bg: "--c-signal-tint", min: 4.5, role: "Positive cell" },
  { fg: "--c-danger", bg: "--c-bg", min: 4.5, role: "Negative delta text" },
  { fg: "--c-danger", bg: "--c-danger-tint", min: 4.5, role: "Negative cell" },
  { fg: "--c-border", bg: "--c-bg", min: 3, role: "Input border (UI)" },
  { fg: "--c-dark-ink", bg: "--c-dark-bg", min: 4.5, role: "Dark CTA band text" },
  { fg: "--c-signal-on-dark", bg: "--c-dark-bg", min: 4.5, role: "Signal on dark band" },
];

const errors = [];

function rel(p) {
  return path.relative(ROOT, p);
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(css|tsx|ts|jsx|js|mdx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function parseTokens(css) {
  const map = {};
  const re = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi;
  let m;
  while ((m = re.exec(css))) {
    map[m[1]] = m[2].trim().replace(/\/\*.*\*\//, "").trim();
  }
  return map;
}

function hexToRgb(hex) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function relativeLuminance({ r, g, b }) {
  const srgb = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

function contrastRatio(a, b) {
  const L1 = relativeLuminance(a);
  const L2 = relativeLuminance(b);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

function lineHasException(lines, index, ruleId) {
  const cur = lines[index] ?? "";
  const prev = lines[index - 1] ?? "";
  const hit = (s) => {
    const m = s.match(EXCEPTION_RE);
    return m && (!ruleId || m[1].toLowerCase() === ruleId.toLowerCase() || m[1] === "all");
  };
  return hit(cur) || hit(prev);
}

function report(file, line, rule, message) {
  errors.push(`${rel(file)}:${line}: [${rule}] ${message}`);
}

function scanFile(file) {
  const normalized = path.normalize(path.relative(ROOT, file));
  if (TOKEN_FILES.has(normalized)) return;

  const text = fs.readFileSync(file, "utf8");
  const lines = text.split(/\r?\n/);
  const isCss = file.endsWith(".css");

  lines.forEach((line, i) => {
    const n = i + 1;

    if (isCss) {
      GRADIENT_RE.lastIndex = 0;
      if (GRADIENT_RE.test(line) && !lineHasException(lines, i, "A1")) {
        report(file, n, "A1", "gradient function disallowed");
      }
      GLOW_SHADOW_RE.lastIndex = 0;
      if (GLOW_SHADOW_RE.test(line) && !lineHasException(lines, i, "A1")) {
        report(file, n, "A1", "glow-like shadow disallowed");
      }
      HEX_RE.lastIndex = 0;
      if (HEX_RE.test(line) && !lineHasException(lines, i, "token-color")) {
        // Allow hex inside url(#id) SVG fragments only
        if (!/url\(\s*#/.test(line)) {
          report(file, n, "token-color", "raw hex color outside tokens.css");
        }
      }
      RGB_HSL_RE.lastIndex = 0;
      if (RGB_HSL_RE.test(line) && !lineHasException(lines, i, "token-color")) {
        report(file, n, "token-color", "raw rgb/hsl color outside tokens.css");
      }
      FONT_SIZE_PX_RE.lastIndex = 0;
      if (FONT_SIZE_PX_RE.test(line) && !lineHasException(lines, i, "A9")) {
        report(file, n, "A9", "raw px font-size; use --t-*-size");
      }
      // Allow 0 / 0px
      SPACING_PX_RE.lastIndex = 0;
      if (SPACING_PX_RE.test(line) && !lineHasException(lines, i, "A8")) {
        if (!/:\s*0(px)?\s*(!important)?;?/.test(line) && !/:\s*[^;]*\b0px\b[^0-9]/.test(line.replace(/[0-9.]+px/g, (m) => (m === "0px" ? "" : m)))) {
          // Fail if any non-zero px remains in spacing props
          const nonzero = line.match(/[1-9][0-9]*(\.[0-9]+)?px/);
          if (nonzero) report(file, n, "A8", `raw spacing px ${nonzero[0]}; use --space-*`);
        }
      }
    }

    EMOJI_RE.lastIndex = 0;
    if (EMOJI_RE.test(line) && !lineHasException(lines, i, "A2")) {
      report(file, n, "A2", "emoji in UI source");
    }
  });

  if (isCss) {
    DARK_PAGE_RE.lastIndex = 0;
    let m;
    while ((m = DARK_PAGE_RE.exec(text))) {
      const line = text.slice(0, m.index).split(/\r?\n/).length;
      if (!lineHasException(lines, line - 1, "light-only")) {
        report(file, line, "light-only", "dark background on html/body disallowed for v1");
      }
    }

    // Ban --c-dark-bg and hex backgrounds darker than #e5e5e5 outside buttons.
    let selectorCtx = "";
    lines.forEach((line, i) => {
      const n = i + 1;
      if (line.includes("{")) {
        selectorCtx = line.split("{")[0] ?? selectorCtx;
      }
      if (line.includes("}")) selectorCtx = "";
      const isButton =
        /\.btn\b|button\b|\.icon-btn\b/i.test(selectorCtx) ||
        /\.btn\b|button\b|\.icon-btn\b/i.test(line);
      if (lineHasException(lines, i, "light-only") || lineHasException(lines, i, "A1")) return;

      if (/--c-dark-bg/.test(line) && /background/.test(line) && !isButton) {
        report(file, n, "light-only", "--c-dark-bg background outside buttons disallowed");
      }

      const bgMatch = line.match(/background(?:-color)?\s*:\s*([^;]+)/i);
      if (bgMatch && !isButton) {
        const hexes = bgMatch[1].match(/#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g) || [];
        for (const hex of hexes) {
          let h = hex.slice(1);
          if (h.length === 3) h = h.split("").map((c) => c + c).join("");
          const value = parseInt(h, 16);
          if (value < 0xe5e5e5) {
            report(
              file,
              n,
              "light-only",
              `background ${hex} is darker than #e5e5e5 outside buttons`,
            );
          }
        }
      }
    });
  }
}

function checkContrast(tokens) {
  for (const pair of CONTRAST_PAIRS) {
    const fgHex = tokens[pair.fg];
    const bgHex = tokens[pair.bg];
    if (!fgHex?.startsWith("#") || !bgHex?.startsWith("#")) {
      report(TOKENS_PATH, 1, "A13", `missing token ${!fgHex ? pair.fg : pair.bg} for ${pair.role}`);
      continue;
    }
    const fg = hexToRgb(fgHex);
    const bg = hexToRgb(bgHex);
    if (!fg || !bg) {
      report(TOKENS_PATH, 1, "A13", `unparseable color for ${pair.role}`);
      continue;
    }
    const ratio = contrastRatio(fg, bg);
    if (ratio + 1e-6 < pair.min) {
      report(
        TOKENS_PATH,
        1,
        "A13",
        `${pair.role}: ${pair.fg} on ${pair.bg} is ${ratio.toFixed(2)}:1 (need ${pair.min}:1)`,
      );
    }
  }
}

function main() {
  if (!fs.existsSync(TOKENS_PATH)) {
    console.error("design/tokens.css missing");
    process.exit(1);
  }
  const tokensCss = fs.readFileSync(TOKENS_PATH, "utf8");
  const tokens = parseTokens(tokensCss);
  checkContrast(tokens);

  for (const dir of SCAN_DIRS) {
    for (const file of walk(path.join(ROOT, dir))) scanFile(file);
  }

  if (errors.length) {
    console.error(`design-check failed (${errors.length} issue${errors.length === 1 ? "" : "s"}):\n`);
    for (const e of errors) console.error(`  ${e}`);
    console.error(
      "\nAdd a same-line or previous-line comment: /* design-exception: <rule> <reason> */",
    );
    process.exit(1);
  }
  console.log("design-check passed (A1–A18 gates + WCAG AA token pairs)");
}

main();
