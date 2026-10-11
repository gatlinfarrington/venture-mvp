import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Root layout uses `title.template = "%s · ${brand.name}"`.
 * Document `metadata.title` / `generateMetadata` title must not already include the brand.
 * openGraph.title and twitter.title may include it.
 */
function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.tsx?$/.test(name)) out.push(path);
  }
  return out;
}

function documentTitleOffenders(src: string): boolean {
  // Remove openGraph / twitter blocks so brand suffixes there do not count.
  const stripped = src
    .replace(/openGraph:\s*\{[\s\S]*?\n\s*\},?/g, "")
    .replace(/twitter:\s*\{[\s\S]*?\n\s*\},?/g, "");
  return /title:\s*`[^`]*\$\{brand\.name\}`/.test(stripped);
}

describe("document title templates", () => {
  it("does not bake brand.name into document titles", () => {
    const files = walk(join(process.cwd(), "app"));
    const offenders = files
      .filter((file) => documentTitleOffenders(readFileSync(file, "utf8")))
      .map((file) => file.replace(`${process.cwd()}/`, ""));
    expect(offenders).toEqual([]);
  });

  it("success page title is the bare segment for the layout template", () => {
    const src = readFileSync(join(process.cwd(), "app/success/page.tsx"), "utf8");
    expect(src).toMatch(/title:\s*"Your license key"/);
  });
});
