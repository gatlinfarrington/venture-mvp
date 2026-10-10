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
  it("ships the four programmatic routes", () => {
    expect(seoPages.map((p) => p.slug).sort()).toEqual(
      [
        "gumroad-to-google-sheets",
        "lemon-squeezy-to-google-sheets",
        "mrr-spreadsheet-template",
        "polar-to-google-sheets",
      ].sort(),
    );
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
