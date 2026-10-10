import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const files = [
  "components/LandingSections.tsx",
  "app/docs/faq/page.tsx",
  "app/privacy/page.tsx",
  "app/terms/page.tsx",
];

describe("OAuth scope copy", () => {
  it("does not claim Google Drive access is required", () => {
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      expect(text).not.toMatch(/related Drive file access/i);
      expect(text).not.toMatch(/Drive file access required/i);
      expect(text).toMatch(/spreadsheets\.currentonly|current spreadsheet/i);
      expect(text).toMatch(/external_request|outbound HTTPS/i);
    }
  });

  it("names the trigger and UI scopes in privacy", () => {
    const privacy = readFileSync("app/privacy/page.tsx", "utf8");
    expect(privacy).toContain("script.scriptapp");
    expect(privacy).toContain("script.container.ui");
    expect(privacy).toContain("script.external_request");
    expect(privacy).toContain("spreadsheets.currentonly");
  });
});
