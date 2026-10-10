import { z } from "zod";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD");

export const blogFrontmatterSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1).max(320),
  date: isoDate,
  tags: z.array(z.string().min(1)).min(1),
  draft: z.boolean().optional().default(false),
  ogTitle: z.string().min(1).optional(),
});

export const changelogFrontmatterSchema = z.object({
  title: z.string().min(1),
  date: isoDate,
  tags: z.array(z.string().min(1)).optional().default([]),
});

export type BlogFrontmatter = z.infer<typeof blogFrontmatterSchema>;
export type ChangelogFrontmatter = z.infer<typeof changelogFrontmatterSchema>;
