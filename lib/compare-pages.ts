import { brand } from "@/lib/brand";
import { pricing } from "@/lib/site";

export type CompareCell = string | boolean;

export type CompareRow = {
  feature: string;
  us: CompareCell;
  them: CompareCell;
};

export type ComparePage = {
  slug: string;
  path: string;
  competitor: string;
  title: string;
  description: string;
  h1: string;
  lede: string;
  ogEyebrow: string;
  ogTitle: string;
  ogSubtitle: string;
  rows: CompareRow[];
  sections: Array<{ h2: string; paragraphs: string[] }>;
  sources: Array<{ label: string; href: string; note: string }>;
  checkedOn: string;
};

const checkedOn = "2026-10-10";

const rsPrice = `Free; Pro $${pricing.pro.monthly}/mo; Business $${pricing.business.monthly}/mo`;

export const comparePages: ComparePage[] = [
  {
    slug: "baremetrics",
    path: "/vs/baremetrics",
    competitor: "Baremetrics",
    title: "vs Baremetrics",
    description: `How ${brand.name} compares to Baremetrics: sheet-native MRR vs a hosted subscription analytics suite. Fair table with linked public sources.`,
    h1: "Baremetrics vs a sheet you own",
    lede: `Baremetrics is a hosted subscription analytics product built around Stripe-shaped SaaS metrics, recovery tools, and planning. ${brand.name} is a Google Sheets add-on: it backfills Lemon Squeezy, Polar, Gumroad, or Stripe into tabs you control and builds an MRR dashboard there. Pick Baremetrics when you want their cloud product; pick ${brand.name} when the ledger should stay in Sheets.`,
    ogEyebrow: "Compare · Baremetrics",
    ogTitle: "Baremetrics vs a sheet you own",
    ogSubtitle: "Hosted SaaS analytics vs sheet-native sync for indie storefronts.",
    checkedOn,
    rows: [
      { feature: "Where data lives", us: "Your Google Sheet", them: "Baremetrics cloud" },
      { feature: "Primary job", us: "Imports orders and builds an MRR tab", them: "Hosted SaaS metrics suite" },
      {
        feature: "Paid pricing (public)",
        us: rsPrice,
        them: `Starts at $49/mo billed annually (Launch; checked ${checkedOn})`,
      },
      { feature: "Free tier", us: "Yes: 1 source, manual refresh", them: "Trial; no free-forever plan listed" },
      {
        feature: "Indie storefronts (Lemon Squeezy / Polar / Gumroad / Stripe)",
        us: true,
        them: "Stripe-first; other billing via their integrations",
      },
      { feature: "Full history backfill into Sheets", us: true, them: false },
      { feature: "Your own QUERY / formulas on raw rows", us: true, them: "Exports or their UI" },
      { feature: "Payment recovery / cancel insights add-ons", us: false, them: true },
      { feature: "Scenario / financial planning tools", us: false, them: "Growth / Scale plans" },
    ],
    sections: [
      {
        h2: "When Baremetrics fits better",
        paragraphs: [
          "You run a Stripe-centered SaaS, want investor-grade hosted dashboards, benchmarks, payment recovery, or cancellation insights, and you are fine keeping analytics in Baremetrics instead of a spreadsheet.",
        ],
      },
      {
        h2: `When ${brand.name} fits better`,
        paragraphs: [
          "You sell on Lemon Squeezy, Polar, Gumroad, or Stripe (or a mix), already model runway and tax in Google Sheets, and want scheduled sync plus an MRR tab without standing up another analytics SaaS.",
        ],
      },
    ],
    sources: [
      {
        label: "Baremetrics pricing",
        href: "https://baremetrics.com/pricing",
        note: `FAQ lists Launch from $49/mo (annual billing). Checked ${checkedOn}.`,
      },
    ],
  },
  {
    slug: "chartmogul",
    path: "/vs/chartmogul",
    competitor: "ChartMogul",
    title: "vs ChartMogul",
    description: `How ${brand.name} compares to ChartMogul: Google Sheets MRR sync vs ChartMogul’s subscription analytics platform. Fair table with linked public sources.`,
    h1: "ChartMogul vs a sheet you own",
    lede: `ChartMogul is a subscription analytics platform for MRR, ARR, churn, and related SaaS reporting, with pricing that scales with tracked ARR. ${brand.name} does not replace ChartMogul’s hosted analytics depth. It writes storefront data into Google Sheets and builds a practical MRR dashboard from those rows.`,
    ogEyebrow: "Compare · ChartMogul",
    ogTitle: "ChartMogul vs a sheet you own",
    ogSubtitle: "Hosted subscription analytics vs sheet-native storefront sync.",
    checkedOn,
    rows: [
      { feature: "Where data lives", us: "Your Google Sheet", them: "ChartMogul cloud" },
      { feature: "Primary job", us: "Imports orders and builds an MRR tab", them: "Investor-grade SaaS metrics platform" },
      {
        feature: "Paid pricing (public)",
        us: rsPrice,
        them: `Free up to $10K MRR; paid Starter starts at $69/mo ($57/mo billed annually; checked ${checkedOn})`,
      },
      { feature: "Free tier", us: "Yes: 1 source, manual refresh", them: "Yes: up to $10K MRR" },
      {
        feature: "Indie storefronts (Lemon Squeezy / Polar / Gumroad / Stripe)",
        us: true,
        them: "Billing sources + custom/third-party (incl. Sheets/Zapier as sources)",
      },
      { feature: "Full history backfill into Sheets", us: true, them: "Sheets is an input, not the product home" },
      { feature: "Your own QUERY / formulas on raw rows", us: true, them: "Exports or their reports" },
      { feature: "Multi-billing unification & CRM features", us: false, them: true },
      { feature: "Warehouse / advanced destinations", us: false, them: "Pro / Enterprise" },
    ],
    sections: [
      {
        h2: "When ChartMogul fits better",
        paragraphs: [
          "You need a system of record for complex subscription billing, board-ready SaaS metrics, CRM workflows beside revenue, or warehouse destinations, and you are willing to pay as tracked ARR grows.",
        ],
      },
      {
        h2: `When ${brand.name} fits better`,
        paragraphs: [
          "You want the rows in a sheet you already share with an accountant or cofounder, syncing Lemon Squeezy, Polar, Gumroad, or Stripe without adopting a full analytics platform.",
        ],
      },
    ],
    sources: [
      {
        label: "ChartMogul pricing",
        href: "https://chartmogul.com/pricing/",
        note: `Free to $10K MRR; Starter from $69/$57 monthly/annual. Checked ${checkedOn}.`,
      },
    ],
  },
  {
    slug: "zapier",
    path: "/vs/zapier",
    competitor: "Zapier",
    title: "vs Zapier",
    description: `How ${brand.name} compares to Zapier to Google Sheets automations: history backfill and an MRR dashboard vs append-only Zaps. Fair table with linked public sources.`,
    h1: "Zapier append vs a sheet built for revenue",
    lede: `Zapier is excellent at moving new events into Google Sheets. It is not a revenue importer: Zaps typically append rows going forward, burn tasks per action, and leave MRR math to you. ${brand.name} walks source history APIs once, keeps tabs updated, and builds the dashboard tab.`,
    ogEyebrow: "Compare · Zapier",
    ogTitle: "Zapier append vs sheet-native revenue",
    ogSubtitle: "Task-based automation vs history backfill and an MRR tab.",
    checkedOn,
    rows: [
      { feature: "Where data lives", us: "Your Google Sheet", them: "Your Google Sheet (via Zaps)" },
      { feature: "Primary job", us: "Storefront sync + MRR tab", them: "General automation across apps" },
      {
        feature: "Paid pricing (public)",
        us: rsPrice,
        them: `Professional starts at $19.99/mo billed annually (750 tasks; checked ${checkedOn})`,
      },
      { feature: "Free tier", us: "Yes: 1 source, manual refresh", them: "Yes: limited tasks / two-step Zaps" },
      { feature: "Full history backfill", us: true, them: "Usually new events only" },
      { feature: "MRR / churn dashboard tab", us: true, them: false },
      { feature: "Multi-source storefront sync", us: "Pro / Business", them: "Separate Zaps per source" },
      { feature: "9,000+ app automations", us: false, them: true },
      { feature: "Task metering", us: "License tiers, not per-row tasks", them: "Tasks per successful action" },
    ],
    sections: [
      {
        h2: "When Zapier fits better",
        paragraphs: [
          "You need cross-app workflows (Slack alerts, CRM updates, form to sheet) beyond revenue sync, or you only care about appending brand-new events and will maintain formulas yourself.",
        ],
      },
      {
        h2: `When ${brand.name} fits better`,
        paragraphs: [
          "You need last year’s orders in the sheet, stable columns, refunds that update the original sale, and an MRR dashboard, without designing and metering a Zap per storefront event type.",
        ],
      },
    ],
    sources: [
      {
        label: "Zapier pricing",
        href: "https://zapier.com/pricing",
        note: `Professional from $19.99/mo billed annually at 750 tasks/mo. Checked ${checkedOn}.`,
      },
    ],
  },
];

export function getComparePage(slug: string) {
  return comparePages.find((p) => p.slug === slug);
}
