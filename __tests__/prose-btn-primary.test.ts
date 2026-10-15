import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

function ruleBody(selector: string): string {
  const re = new RegExp(
    `${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`,
  );
  const m = css.match(re);
  expect(m, `missing rule for ${selector}`).toBeTruthy();
  return m![1]!;
}

describe("prose link rules leave .btn alone", () => {
  it("scopes prose anchors with :not(.btn)", () => {
    expect(css).toMatch(/\.seo-page\s+\.prose\s+a:not\(\.btn\)/);
    expect(css).toMatch(/\.legal\s+\.prose\s+a:not\(\.btn\)/);
    expect(css).toMatch(/\.docs-page\s+\.prose\s+a:not\(\.btn\)/);
    expect(css).toMatch(/\.docs-main\s+\.prose\s+a:not\(\.btn\)/);
    expect(css).toMatch(/\.blog-post\s+\.prose\s+a:not\(\.btn\)/);
  });

  it("restores btn-primary inverse ink inside prose", () => {
    expect(ruleBody(".prose .btn")).toMatch(/text-decoration:\s*none/);
    expect(ruleBody(".prose .btn-primary")).toMatch(
      /color:\s*var\(--c-ink-inverse\)/,
    );
  });

  it("uses muted ink on the disabled sample copy pill", () => {
    expect(ruleBody(".sample-copy-btn")).toMatch(/color:\s*var\(--c-ink-muted\)/);
  });
});
