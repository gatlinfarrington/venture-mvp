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

  it("uses future tense for What will sync headings and scheduled sync", () => {
    for (const page of seoPages) {
      for (const section of page.sections) {
        expect(section.h2).not.toMatch(/^What syncs from /);
        if (/^What will sync from /.test(section.h2)) {
          expect(section.h2).toMatch(/^What will sync from (Stripe|Polar|Lemon Squeezy|Gumroad)$/);
        }
        for (const p of section.paragraphs) {
          expect(p).not.toMatch(/\bscheduled sync keeps\b/);
          expect(p).not.toMatch(/\bthen keep the sheet current\b/);
        }
      }
    }
    const stripe = seoPages.find((p) => p.slug === "stripe-to-google-sheets")!;
    expect(stripe.sections.some((s) => s.h2 === "What will sync from Stripe")).toBe(true);
    expect(stripe.sections[0]!.paragraphs[0]).toMatch(/scheduled sync will keep the sheet current/);
    const polar = seoPages.find((p) => p.slug === "polar-analytics")!;
    expect(polar.sections.some((s) => s.h2 === "What will sync from Polar")).toBe(true);
  });
});

