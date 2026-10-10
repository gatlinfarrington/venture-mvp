import { describe, expect, it } from "vitest";
import { seoPages } from "@/lib/seo-pages";

const banned = [
  "supercharge",
  "unlock",
  "seamless",
  "revolutionize",
  "all-in-one",
  "game-changer",
  "lorem",
];

describe("seo pages", () => {
  it("ships one comparison route per requested source slug", () => {
    expect(seoPages.map((p) => p.slug).sort()).toEqual(
      [
        "gumroad-analytics-google-sheets",
        "lemon-squeezy-analytics",
        "polar-analytics",
        "stripe-to-google-sheets",
      ].sort(),
    );
  });

  it("gives each page unique title, h1, and OG title", () => {
    const titles = new Set(seoPages.map((p) => p.title));
    const h1s = new Set(seoPages.map((p) => p.h1));
    const ogs = new Set(seoPages.map((p) => p.ogTitle));
    expect(titles.size).toBe(seoPages.length);
    expect(h1s.size).toBe(seoPages.length);
    expect(ogs.size).toBe(seoPages.length);
  });

  it("avoids filler marketing words", () => {
    const blob = seoPages
      .map((p) => [p.title, p.description, p.lede, ...p.sections.flatMap((s) => s.paragraphs)].join(" "))
      .join(" ")
      .toLowerCase();
    for (const word of banned) {
      expect(blob.includes(word)).toBe(false);
    }
  });
});
