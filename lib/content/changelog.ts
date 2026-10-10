import matter from "gray-matter";
import {
  changelogFrontmatterSchema,
  type ChangelogFrontmatter,
} from "@/lib/content/schema";
import { CONTENT_ROOT, listMdxFiles, readFile, slugFromFilename } from "@/lib/content/fs";

export type ChangelogEntry = ChangelogFrontmatter & {
  slug: string;
  body: string;
};

const CHANGELOG_DIR = `${CONTENT_ROOT}/changelog`;

function parseEntry(filePath: string): ChangelogEntry {
  const raw = readFile(filePath);
  const { data, content } = matter(raw);
  const fm = changelogFrontmatterSchema.parse(data);
  return {
    ...fm,
    slug: slugFromFilename(filePath),
    body: content.trim(),
  };
}

/** Newest first. */
export function getChangelogEntries(): ChangelogEntry[] {
  return listMdxFiles(CHANGELOG_DIR)
    .map(parseEntry)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.title.localeCompare(b.title)));
}
