import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { REFUND_LINE } from "@/lib/copy";

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(tsx|ts|mdx|md)$/.test(name)) out.push(full);
  }
  return out;
}

const SUPPORT_EMAIL = /support@[a-z0-9.-]+/i;
/** Refund line is the only place we publish support@ (purchase-email replies). */
const ALLOWED_SUPPORT_EMAIL = "support@revenuesheet.app";

describe("support contact copy", () => {
  it("publishes support@ only in the refund line; Footer still links to /support", () => {
    expect(REFUND_LINE).toContain(ALLOWED_SUPPORT_EMAIL);

    const roots = ["app", "components", "lib", "content"];
    const files = roots.flatMap((dir) => walk(dir));
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      const matches = text.match(new RegExp(SUPPORT_EMAIL.source, "gi")) || [];
      for (const m of matches) {
        expect(m.toLowerCase(), file).toBe(ALLOWED_SUPPORT_EMAIL);
      }
    }
    const footer = readFileSync("components/Footer.tsx", "utf8");
    expect(footer).toContain('href="/support"');
    expect(footer).not.toContain("supportMailto");
    expect(footer).not.toMatch(SUPPORT_EMAIL);
  });
});
