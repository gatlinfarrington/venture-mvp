import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

type BlogMeta = { slug: string; title: string; body: string; hasTable: boolean };

function loadPublishedPosts(): BlogMeta[] {
  const dir = path.join(process.cwd(), "content/blog");
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mdx"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(dir, file), "utf8");
      const { data, content } = matter(raw);
      return {
        slug: file.replace(/\.mdx$/, ""),
        title: String(data.title ?? ""),
        body: content.trim(),
        draft: Boolean(data.draft),
        hasTable: /(^|\n)\|[^\n]+\|\s*\n\|[-:| ]+\|/.test(content),
      };
    })
    .filter((p) => !p.draft)
    .map(({ draft: _d, ...rest }) => rest);
}

const posts = loadPublishedPosts();

test.describe("blog post render quality", () => {
  test("published catalog is non-empty", () => {
    expect(posts.length).toBeGreaterThan(0);
  });

  for (const post of posts) {
    test(`/blog/${post.slug} has one h1 and no raw markdown tables`, async ({
      page,
    }) => {
      const res = await page.goto(`/blog/${post.slug}`, {
        waitUntil: "domcontentloaded",
      });
      expect(res, `navigation to /blog/${post.slug}`).not.toBeNull();
      expect(res!.status(), `/blog/${post.slug} status`).toBe(200);

      await expect(page.locator("main.blog-post h1")).toHaveCount(1);
      await expect(page.locator("main.blog-post h1")).toHaveText(post.title);

      const bodyText = await page.locator("main.blog-post").innerText();
      expect(
        bodyText.includes("|---") || bodyText.includes("| ---"),
        `${post.slug} still contains a raw markdown table separator (remark-gfm missing?)`,
      ).toBe(false);

      if (post.hasTable) {
        const tableCount = await page.locator("main.blog-post .prose table").count();
        expect(
          tableCount,
          `${post.slug} has a markdown table but no rendered <table>`,
        ).toBeGreaterThan(0);
      }
    });
  }
});
