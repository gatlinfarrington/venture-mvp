import { describe, expect, it } from "vitest";
import { comparePages } from "@/lib/compare-pages";

describe("compare pages", () => {
  it("covers Baremetrics, ChartMogul, and Zapier with dated sources", () => {
    expect(comparePages.map((p) => p.slug).sort()).toEqual([
      "baremetrics",
      "chartmogul",
      "zapier",
    ]);
    for (const page of comparePages) {
      expect(page.path).toBe(`/vs/${page.slug}`);
      expect(page.sources.length).toBeGreaterThan(0);
      expect(page.checkedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      for (const source of page.sources) {
        expect(source.href).toMatch(/^https:\/\//);
        expect(source.note.toLowerCase()).toContain("checked");
      }
      // Avoid overconfident exact-price claims without "starts at" framing
      const priceRow = page.rows.find((r) => /pricing/i.test(r.feature));
      expect(priceRow).toBeTruthy();
      expect(String(priceRow!.them).toLowerCase()).toMatch(/starts at|free up to/);
    }
  });
});
