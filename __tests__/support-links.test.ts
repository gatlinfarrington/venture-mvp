import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(tsx|ts|mdx|md)$/.test(name)) out.push(full);
  }
  return out;
}

describe("support contact copy", () => {
  it("does not publish a support@ email; links to /support instead", () => {
    const roots = ["app", "components", "lib", "content"];
    const files = roots.flatMap((dir) => walk(dir));
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      expect(text, file).not.toMatch(/support@[a-z0-9.-]+/i);
    }
    const footer = readFileSync("components/Footer.tsx", "utf8");
    expect(footer).toContain('href="/support"');
    expect(footer).not.toContain("supportMailto");
  });
});
