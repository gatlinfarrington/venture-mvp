import { describe, expect, it } from "vitest";
import { getAllBlogPosts, getBlogTags } from "@/lib/content/blog";
import { getChangelogEntries } from "@/lib/content/changelog";

describe("content pipeline", () => {
  it("loads published blog posts with unique slugs", () => {
    const posts = getAllBlogPosts();
    expect(posts.length).toBeGreaterThan(0);
    const slugs = new Set(posts.map((p) => p.slug));
    expect(slugs.size).toBe(posts.length);
    for (const post of posts) {
      expect(post.draft).toBe(false);
      expect(post.tags.length).toBeGreaterThan(0);
      expect(post.body.length).toBeGreaterThan(0);
      // Page template already renders <h1>{title}</h1>; body must not repeat it.
      expect(
        post.body.trimStart().startsWith("# "),
        `${post.slug} body starts with a duplicate markdown H1`,
      ).toBe(false);
    }
  });

  it("exposes tags used by posts", () => {
    expect(getBlogTags().length).toBeGreaterThan(0);
  });

  it("loads changelog entries newest first", () => {
    const entries = getChangelogEntries();
    expect(entries.length).toBeGreaterThan(0);
    for (let i = 1; i < entries.length; i++) {
      expect(entries[i - 1].date >= entries[i].date).toBe(true);
    }
  });
});
