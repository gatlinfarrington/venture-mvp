#!/usr/bin/env node
/**
 * Validate content/blog and content/changelog frontmatter (Zod-compatible rules).
 * Fails CI when a post is missing required fields or uses a bad date/slug.
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const ROOT = path.join(process.cwd(), "content");
const errors = [];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((n) => n.endsWith(".mdx") || n.endsWith(".md"))
    .map((n) => path.join(dir, n));
}

function fail(file, msg) {
  errors.push(`${path.relative(process.cwd(), file)}: ${msg}`);
}

function validateBlog(file) {
  const slug = path.basename(file).replace(/\.mdx?$/, "");
  if (!SLUG.test(slug)) fail(file, `slug "${slug}" must be lowercase kebab-case`);
  const { data, content } = matter(fs.readFileSync(file, "utf8"));
  if (!data.title || typeof data.title !== "string") fail(file, "title required");
  if (!data.description || typeof data.description !== "string") fail(file, "description required");
  if (typeof data.description === "string" && data.description.length > 320) {
    fail(file, "description must be ≤ 320 characters");
  }
  if (!data.date || !ISO_DATE.test(String(data.date))) fail(file, "date must be YYYY-MM-DD");
  if (!Array.isArray(data.tags) || data.tags.length < 1) fail(file, "tags must be a non-empty array");
  if (data.draft != null && typeof data.draft !== "boolean") fail(file, "draft must be boolean");
  if (!content.trim()) fail(file, "body must not be empty");
}

function validateChangelog(file) {
  const { data, content } = matter(fs.readFileSync(file, "utf8"));
  if (!data.title || typeof data.title !== "string") fail(file, "title required");
  if (!data.date || !ISO_DATE.test(String(data.date))) fail(file, "date must be YYYY-MM-DD");
  if (data.tags != null && !Array.isArray(data.tags)) fail(file, "tags must be an array when set");
  if (!content.trim()) fail(file, "body must not be empty");
}

for (const file of walk(path.join(ROOT, "blog"))) validateBlog(file);
for (const file of walk(path.join(ROOT, "changelog"))) validateChangelog(file);

if (!walk(path.join(ROOT, "blog")).length) errors.push("content/blog: expected at least one post");
if (!walk(path.join(ROOT, "changelog")).length) {
  errors.push("content/changelog: expected at least one entry");
}

if (errors.length) {
  console.error(`validate-content failed (${errors.length}):\n`);
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}

console.log("validate-content passed");
