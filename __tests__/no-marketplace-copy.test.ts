import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Buyer-facing copy must not claim a Workspace Marketplace listing after
 * Google rejected it. /privacy is intentionally left alone; docs must not
 * mention Marketplace. Matches the word in string literals only — not
 * identifiers like marketplaceUrl / NEXT_PUBLIC_MARKETPLACE_URL.
 */
const ROOTS = ["app", "components", "content"] as const;
const ALLOW_PATH_PARTS = [
  `${path.sep}privacy${path.sep}`,
  `${path.sep}design${path.sep}`,
];

/** Quoted / template-literal spans that include the word Marketplace. */
const STRING_MARKETPLACE =
  /(['"`])(?:(?!\1)[^\\]|\\.)*\bMarketplace\b(?:(?!\1)[^\\]|\\.)*\1/;

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      walk(full, out);
    } else if (/\.(tsx|ts|mdx|md)$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

describe("no Marketplace buyer copy", () => {
  it("keeps Marketplace out of string literals outside privacy", () => {
    const hits: string[] = [];
    for (const root of ROOTS) {
      for (const file of walk(path.join(process.cwd(), root))) {
        if (ALLOW_PATH_PARTS.some((p) => file.includes(p))) continue;
        const rel = path.relative(process.cwd(), file);
        const text = fs.readFileSync(file, "utf8");
        // Strip block + line comments so InstallCta / brand docs do not fail.
        const noComments = text
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/^\s*\/\/.*$/gm, "");
        if (STRING_MARKETPLACE.test(noComments)) hits.push(rel);
      }
    }
    expect(hits, `Marketplace still in string literals:\n${hits.join("\n")}`).toEqual([]);
  });
});
