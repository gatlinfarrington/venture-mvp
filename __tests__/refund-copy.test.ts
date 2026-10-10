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

describe("refund copy", () => {
  it("uses the single pre-launch refund line and never promises 14 days", () => {
    expect(REFUND_LINE).toBe(
      "Paid plans aren't on sale yet. Refund terms will be published before checkout opens.",
    );
    const roots = ["app", "components", "lib", "content"];
    const blob = roots
      .flatMap((dir) => walk(dir))
      .map((f) => readFileSync(f, "utf8"))
      .join("\n");
    expect(blob).not.toMatch(/14 days/i);
    expect(blob).toContain(REFUND_LINE);
  });
});
