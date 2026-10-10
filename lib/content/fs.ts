import fs from "node:fs";
import path from "node:path";

export const CONTENT_ROOT = path.join(process.cwd(), "content");

export function listMdxFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".mdx") || name.endsWith(".md"))
    .map((name) => path.join(dir, name))
    .sort();
}

export function slugFromFilename(filePath: string): string {
  return path.basename(filePath).replace(/\.mdx?$/, "");
}

export function readFile(filePath: string): string {
  return fs.readFileSync(filePath, "utf8");
}
