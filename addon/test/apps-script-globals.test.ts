import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildQuery } from "../src/lib/query";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
// Globals that don't exist in Apps Script V8.
const FORBIDDEN = /\b(URLSearchParams|new URL\(|URL\.(createObjectURL|parse|canParse)|TextEncoder|TextDecoder|Buffer\.|atob\(|btoa\(|setTimeout\(|setInterval\(|structuredClone\(|AbortController|(?<![.\w])fetch\()/;
// Node-test-only async path, guarded by `typeof UrlFetchApp`.
const ALLOW = [/globalThis\.fetch/, /fetchImpl\(/];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.ts$/.test(f) ? [p] : [];
  });
}

test("addon/src references no browser/Node-only globals", () => {
  const hits: string[] = [];
  for (const f of files(SRC)) {
    readFileSync(f, "utf8").split("\n").forEach((line, i) => {
      const code = line.replace(/\/\/.*$/, "").replace(/^\s*\*.*$/, "");
      if (FORBIDDEN.test(code) && !ALLOW.some((a) => a.test(code))) hits.push(`${f}:${i + 1}: ${line.trim()}`);
    });
  }
  assert.deepEqual(hits, []);
});

test("buildQuery encodes and supports Stripe array params", () => {
  assert.equal(
    buildQuery([["limit", "100"], ["expand[]", "data.customer"], ["expand[]", "data.items"], ["starting_after", "ch_1"], ["x", undefined]]),
    "limit=100&expand%5B%5D=data.customer&expand%5B%5D=data.items&starting_after=ch_1",
  );
  assert.equal(buildQuery({ a: "b c&d", "created_at.gt": "2026-01-01T00:00:00Z" }), "a=b%20c%26d&created_at.gt=2026-01-01T00%3A00%3A00Z");
});
