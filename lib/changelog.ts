export type ChangelogEntry = {
  date: string;
  title: string;
  body: string;
  tags?: string[];
};

/** Newest first. Keep copy factual — no filler launch adjectives. */
export const changelog: ChangelogEntry[] = [
  {
    date: "2026-10-10",
    title: "Site expand: docs, pricing, legal, SEO guides",
    body: "Dedicated /pricing and /docs help center, /changelog, OAuth-ready privacy and terms, and per-source comparison pages with unique Open Graph images. Nav adds Docs alongside Pricing, How it works, and FAQ.",
    tags: ["site", "docs", "legal"],
  },
  {
    date: "2026-10-10",
    title: "Design review: light-only Monolith landing",
    body: "Removed theme toggle and dark page chrome. Hero demo seeds labeled example rows, clamps MRR, and uses transparent stage with border-only sheet chrome. Checkout stays disabled until Stripe keys are configured.",
    tags: ["design", "landing"],
  },
  {
    date: "2026-10-09",
    title: "Marketing site and license API",
    body: "Next.js marketing site with Stripe Checkout (test), license verify API, and SEO guide routes. Google Sheets add-on lives under addon/ with Lemon Squeezy, Polar, and Gumroad importers.",
    tags: ["launch"],
  },
];
