# Content authoring

Publish by adding a Markdown/MDX file and merging to `main`. CI validates frontmatter before build.

## Blog: `content/blog/*.mdx`

Filename becomes the URL slug (`welcome.mdx` → `/blog/welcome`). Use lowercase kebab-case.

```mdx
---
title: "Why we put MRR in Google Sheets"
description: "One or two sentences for SEO, RSS, and social cards."
date: "2026-10-10"
tags: ["product", "mrr"]
draft: false
ogTitle: "Optional shorter OG title"
---

Opening paragraph.

## Subheading

Body copy. Keep it factual. Avoid filler marketing words (supercharge, seamless, unlock…).

- Lists are fine
- Link with `[Docs](/docs)` for internal paths
```

| Field | Required | Notes |
| --- | --- | --- |
| `title` | yes | Page `<title>` and H1 |
| `description` | yes | Meta + RSS summary (≤ 200 chars recommended) |
| `date` | yes | ISO `YYYY-MM-DD` (UTC) |
| `tags` | yes | Non-empty string array; drives `/blog/tag/[tag]` |
| `draft` | no | Default `false`. Drafts are omitted from prod builds |
| `ogTitle` | no | Overrides title on the generated OG image |

Each post gets: index listing, tag pages, RSS (`/blog/rss.xml`), sitemap entry, Article JSON-LD, and a generated Open Graph image.

## Changelog: `content/changelog/*.mdx`

Filename is for editors only; sort is by `date` then title. Rendered on `/changelog`.

```mdx
---
title: "Site expand: docs and pricing"
date: "2026-10-10"
tags: ["site", "docs"]
---

One or two short paragraphs. What shipped, for whom, no hype.
```

| Field | Required | Notes |
| --- | --- | --- |
| `title` | yes | Changelog heading |
| `date` | yes | ISO `YYYY-MM-DD` |
| `tags` | no | Small labels under the entry |

## Validation

```bash
npm run validate:content
```

Wired into `npm run lint` / CI. Invalid or missing fields fail the pipeline.

## Tips

- One idea per post; link out to `/docs` for how-tos.
- Prefer updating changelog when you ship product or site changes.
- Do not put secrets, license keys, or customer data in content files.
