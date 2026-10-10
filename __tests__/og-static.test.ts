import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { designerOgFilename, hasDesignerOg } from "@/lib/og-static";

const requiredKeys = [
  "about",
  "security",
  "support",
  "gumroad-analytics-google-sheets",
  "lemon-squeezy-analytics",
  "polar-analytics",
  "stripe-to-google-sheets",
  "vs-baremetrics",
  "vs-chartmogul",
  "vs-zapier",
] as const;

describe("designer OG assets", () => {
  it("ships PNGs for source, trust, compare, and support routes", () => {
    for (const key of requiredKeys) {
      expect(hasDesignerOg(key), designerOgFilename(key)).toBe(true);
      expect(
        existsSync(path.join(process.cwd(), "public", "og", designerOgFilename(key))),
      ).toBe(true);
    }
  });
});
