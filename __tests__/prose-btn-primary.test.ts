import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

describe("prose link rules leave .btn alone", () => {
  it("scopes prose anchors with :not(.btn)", () => {
    expect(css).toMatch(/\.seo-page\s+\.prose\s+a:not\(\.btn\)/);
    expect(css).toMatch(/\.legal\s+\.prose\s+a:not\(\.btn\)/);
    expect(css).toMatch(/\.docs-page\s+\.prose\s+a:not\(\.btn\)/);
    expect(css).toMatch(/\.docs-main\s+\.prose\s+a:not\(\.btn\)/);
    expect(css).toMatch(/\.blog-post\s+\.prose\s+a:not\(\.btn\)/);
  });

  it("restores btn-primary inverse ink inside prose", () => {
    expect(css).toMatch(/\.prose\s+\.btn\s*\{[^}]*text-decoration:\s*none/s);
    expect(css).toMatch(
      /\.prose\s+\.btn-primary\s*\{[^}]*color:\s*var\(--c-ink-inverse\)/s,
    );
  });

  it("uses muted ink on the disabled sample copy pill", () => {
    expect(css).toMatch(
      /\.sample-copy-btn\s*\{[^}]*color:\s*var\(--c-ink-muted\)/s,
    );
  });
});
