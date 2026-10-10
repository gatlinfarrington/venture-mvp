import matter from "gray-matter";
import { blogFrontmatterSchema, type BlogFrontmatter } from "@/lib/content/schema";
import { CONTENT_ROOT, listMdxFiles, readFile, slugFromFilename } from "@/lib/content/fs";

export type BlogPost = BlogFrontmatter & {
  slug: string;
  body: string;
};

const BLOG_DIR = `${CONTENT_ROOT}/blog`;

function parsePost(filePath: string): BlogPost {
  const raw = readFile(filePath);
  const { data, content } = matter(raw);
  const fm = blogFrontmatterSchema.parse(data);
  return {
    ...fm,
    slug: slugFromFilename(filePath),
    body: content.trim(),
  };
}

/** Published posts only (drafts excluded). Newest first. */
export function getAllBlogPosts(): BlogPost[] {
  return listMdxFiles(BLOG_DIR)
    .map(parsePost)
    .filter((p) => !p.draft)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.slug.localeCompare(b.slug)));
}

export function getBlogPost(slug: string): BlogPost | null {
  return getAllBlogPosts().find((p) => p.slug === slug) ?? null;
}

export function getBlogTags(): string[] {
  const set = new Set<string>();
  for (const post of getAllBlogPosts()) {
    for (const tag of post.tags) set.add(tag);
  }
  return [...set].sort();
}

export function getBlogPostsByTag(tag: string): BlogPost[] {
  const normalized = tag.toLowerCase();
  return getAllBlogPosts().filter((p) =>
    p.tags.some((t) => t.toLowerCase() === normalized),
  );
}
