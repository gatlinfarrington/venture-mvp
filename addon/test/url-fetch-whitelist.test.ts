import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(root, "src", "appsscript.json");

/** Absolute https:// origins that UrlFetchApp may hit (from importer BASE + license default). */
const FETCH_URL_RE =
  /https:\/\/(?:api\.(?:stripe\.com|polar\.sh|lemonsqueezy\.com|gumroad\.com)|(?:sandbox-api\.)?polar\.sh|www\.revenuesheet\.app|revenuesheet\.app)[^\s"'`]*/g;

function walkTsFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) walkTsFiles(full, out);
    else if (name.name.endsWith(".ts")) out.push(full);
  }
  return out;
}

function originPrefix(url: string): string {
  const u = new URL(url);
  return `${u.protocol}//${u.host}/`;
}

function isWhitelisted(url: string, whitelist: string[]): boolean {
  return whitelist.some((prefix) => url.startsWith(prefix) || originPrefix(url).startsWith(prefix));
}

describe("urlFetchWhitelist", () => {
  it("covers every UrlFetch host referenced in addon/src", () => {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      urlFetchWhitelist?: string[];
    };
    const whitelist = manifest.urlFetchWhitelist || [];
    assert.ok(whitelist.length > 0, "appsscript.json must declare urlFetchWhitelist");

    const found = new Set<string>();
    for (const file of walkTsFiles(path.join(root, "src"))) {
      const text = readFileSync(file, "utf8");
      // Skip scope / logo / docs URLs that are not UrlFetch targets.
      if (file.endsWith(`${path.sep}appsscript.json`)) continue;
      for (const match of text.matchAll(FETCH_URL_RE)) {
        found.add(match[0].replace(/[),;.]+$/, ""));
      }
      // Explicit BASE / default license constants.
      for (const m of text.matchAll(
        /(?:BASE|DEFAULT_LICENSE_API_BASE)\s*=\s*["'](https:\/\/[^"']+)["']/g,
      )) {
        found.add(m[1]);
      }
    }

    assert.ok(found.size > 0, "expected at least one fetch URL in source");

    const missing: string[] = [];
    for (const url of found) {
      if (!isWhitelisted(url, whitelist)) missing.push(url);
    }
    assert.deepEqual(
      missing,
      [],
      `urlFetchWhitelist missing hosts for: ${missing.join(", ")}\nWhitelist: ${whitelist.join(", ")}`,
    );
  });

  it("lists the five production API prefixes Google requires", () => {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      urlFetchWhitelist?: string[];
    };
    const whitelist = new Set(manifest.urlFetchWhitelist || []);
    for (const prefix of [
      "https://www.revenuesheet.app/",
      "https://api.stripe.com/",
      "https://api.polar.sh/",
      "https://api.lemonsqueezy.com/",
      "https://api.gumroad.com/",
    ]) {
      assert.ok(whitelist.has(prefix), `missing whitelist entry ${prefix}`);
    }
  });
});
