import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

function publishedBlogSlugs(): string[] {
  const dir = path.join(process.cwd(), "content/blog");
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mdx"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(dir, file), "utf8");
      const { data } = matter(raw);
      return { slug: file.replace(/\.mdx$/, ""), draft: Boolean(data.draft) };
    })
    .filter((p) => !p.draft)
    .map((p) => p.slug);
}

/** Read width/height from a PNG buffer (IHDR chunk). */
function pngSize(buf: Buffer): { width: number; height: number } {
  expect(buf.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(true);
  expect(buf.toString("ascii", 12, 16)).toBe("IHDR");
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

async function assertPng1200x630(
  request: import("@playwright/test").APIRequestContext,
  url: string,
) {
  const res = await request.get(url);
  expect(res.status(), `${url} status`).toBe(200);
  expect(res.headers()["content-type"] ?? "", `${url} content-type`).toMatch(/image\/png/);
  const buf = Buffer.from(await res.body());
  const { width, height } = pngSize(buf);
  expect(width, `${url} width`).toBe(1200);
  expect(height, `${url} height`).toBe(630);
}

function pathAndSearch(absoluteOrPath: string): string {
  try {
    const u = new URL(absoluteOrPath);
    return u.pathname + u.search;
  } catch {
    return absoluteOrPath;
  }
}

test.describe("OG / Twitter images", () => {
  test("/og.png and /opengraph-image are 1200×630 PNGs", async ({ request }) => {
    await assertPng1200x630(request, "/og.png");
    await assertPng1200x630(request, "/opengraph-image");
  });

  test("home meta points at a live 1200×630 image", async ({ page, request }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const og = await page.locator('meta[property="og:image"]').first().getAttribute("content");
    const tw = await page.locator('meta[name="twitter:image"]').first().getAttribute("content");
    expect(og, "og:image").toBeTruthy();
    expect(tw, "twitter:image").toBeTruthy();
    await assertPng1200x630(request, pathAndSearch(og!));
    await assertPng1200x630(request, pathAndSearch(tw!));
  });

  for (const slug of publishedBlogSlugs()) {
    test(`/blog/${slug} meta OG is 1200×630`, async ({ page, request }) => {
      await page.goto(`/blog/${slug}`, { waitUntil: "domcontentloaded" });
      const og = await page.locator('meta[property="og:image"]').first().getAttribute("content");
      const tw = await page.locator('meta[name="twitter:image"]').first().getAttribute("content");
      expect(og, `${slug} og:image`).toBeTruthy();
      expect(tw, `${slug} twitter:image`).toBeTruthy();
      await assertPng1200x630(request, pathAndSearch(og!));
      await assertPng1200x630(request, pathAndSearch(tw!));
    });
  }
});
