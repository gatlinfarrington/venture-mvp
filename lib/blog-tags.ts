/** Display labels for blog tag slugs (P1). */
const TAG_LABELS: Record<string, string> = {
  "lemon-squeezy": "Lemon Squeezy",
  sheets: "Google Sheets",
  product: "Product",
  setup: "Setup",
  polar: "Polar",
  gumroad: "Gumroad",
  stripe: "Stripe",
  mrr: "MRR",
  guides: "Guides",
  churn: "Churn",
  zapier: "Zapier",
  sheetxai: "SheetXAI",
};

export function blogTagLabel(slug: string): string {
  const key = slug.trim().toLowerCase();
  if (TAG_LABELS[key]) return TAG_LABELS[key];
  return key
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
