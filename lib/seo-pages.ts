import { brand } from "@/lib/brand";

export type SeoPage = {
  slug: string;
  title: string;
  description: string;
  h1: string;
  lede: string;
  ogEyebrow: string;
  ogTitle: string;
  sections: Array<{ h2: string; paragraphs: string[]; bullets?: string[] }>;
};

export const seoPages: SeoPage[] = [
  {
    slug: "gumroad-analytics-google-sheets",
    title: "Gumroad analytics in Google Sheets",
    description:
      "Build Gumroad analytics in Google Sheets: sales history, refunds, and product breakdowns that refresh on a schedule — without pasting CSVs every week.",
    h1: "Gumroad analytics that live in Google Sheets",
    lede: `Gumroad’s seller dashboard answers “what sold today.” ${brand.name} answers “what does my sheet say about the last eighteen months?” — with rows you can filter, QUERY, and hand to an accountant.`,
    ogEyebrow: "Gumroad · Google Sheets",
    ogTitle: "Gumroad analytics in a sheet you own",
    sections: [
      {
        h2: "What “analytics” means here",
        paragraphs: [
          "Not another hosted chart product. You get an Orders tab with product, purchaser email, amount, and refund status, plus Dashboard tiles that roll Gumroad net revenue alongside Polar or Lemon Squeezy when those sources are connected.",
        ],
        bullets: [
          "Full sales history backfill on first connect",
          "Refunds update existing rows by id instead of duplicating",
          "Example marketing data is labeled — your sheet uses your store",
        ],
      },
      {
        h2: "Compared to CSV exports and Zapier",
        paragraphs: [
          "CSV exports go stale the day after you paste. Zapier can append new sales but rarely rebuilds history cleanly. An importer built for Sheets walks Gumroad’s API once, then keeps the sheet current on Free (manual) or Pro (scheduled).",
        ],
      },
      {
        h2: "Who this page is for",
        paragraphs: [
          "Indie authors, template sellers, and course creators who already model runway and tax in Google Sheets and do not want a second analytics login for Gumroad alone.",
        ],
      },
    ],
  },
  {
    slug: "stripe-to-google-sheets",
    title: "Stripe to Google Sheets — revenue without leaving the spreadsheet",
    description: `Compare Stripe dashboards to a Google Sheets revenue ledger. How ${brand.name} fits when you sell through Lemon Squeezy today and plan a Stripe migration later.`,
    h1: "Stripe revenue models, in Google Sheets",
    lede: `Stripe’s Dashboard is the system of record for payments. Many operators still want a sheet: QUERY formulas, investor updates, and a single MRR view across marketplaces. ${brand.name} starts with Lemon Squeezy, Polar, and Gumroad — and this page explains how that fits a Stripe-shaped workflow.`,
    ogEyebrow: "Stripe · comparison",
    ogTitle: "Stripe-shaped revenue, sheet-native",
    sections: [
      {
        h2: "Sheets vs the Stripe Dashboard",
        paragraphs: [
          "Use Stripe (or a Stripe-powered merchant of record) when you need payouts, tax forms, and dispute tools. Use Sheets when you need custom cohorts, combined marketplace revenue, or a model your finance person already trusts.",
        ],
        bullets: [
          "Stripe Dashboard: payouts, disputes, Radar, Tax",
          "Google Sheets: formulas, shared models, multi-source MRR",
          `${brand.name}: syncs Lemon Squeezy / Polar / Gumroad into that sheet today`,
        ],
      },
      {
        h2: "Lemon Squeezy and the Stripe transition",
        paragraphs: [
          "If you sell through Lemon Squeezy while evaluating a direct Stripe integration, keep history in Sheets so platform changes do not erase your analytics trail. Connect Lemon Squeezy now; when you add native Stripe support later, the Dashboard tab is already the place KPIs land.",
        ],
      },
      {
        h2: "What to do next",
        paragraphs: [
          `Install ${brand.name}, connect the storefronts you use today, and keep Stripe Checkout (or Lemon Squeezy) as the payment rail. The sheet becomes the analytics layer — not a replacement for Stripe’s money movement tools.`,
        ],
      },
    ],
  },
  {
    slug: "polar-analytics",
    title: "Polar analytics — MRR and orders in Google Sheets",
    description:
      "Polar.sh analytics in Google Sheets: orders, subscriptions, refunds, and an MRR dashboard that stacks Polar with Lemon Squeezy or Gumroad.",
    h1: "Polar analytics without leaving your spreadsheet",
    lede: `Polar’s product UI is built for shipping. ${brand.name} is built for the operators who still open a Sheet every Monday — backfilling Polar history into named tabs and keeping MRR honest across orgs and marketplaces.`,
    ogEyebrow: "Polar.sh",
    ogTitle: "Polar analytics in Google Sheets",
    sections: [
      {
        h2: "What syncs from Polar",
        paragraphs: [
          "Orders, subscriptions, customers, and refunds map into stable column headers. Amounts keep Polar’s currency; the Dashboard rolls MRR in your reporting currency from Settings.",
        ],
        bullets: [
          "Orders: id, created, product, email, amount, status",
          "Subscriptions: status, renewals, MRR contribution",
          "Refunds linked to the original order id",
        ],
      },
      {
        h2: "Why not the Polar dashboard alone?",
        paragraphs: [
          "Polar is excellent for one organization. When you also sell on Lemon Squeezy or Gumroad — or you want QUERY against every invoice — a sheet with scheduled refresh beats exporting CSVs before every board update.",
        ],
      },
      {
        h2: "How to connect",
        paragraphs: [
          `Install ${brand.name}, open the sidebar, choose Polar, and paste an organization access token with read access to orders and subscriptions. Run Backfill once, then enable scheduled refresh on Pro or Business.`,
        ],
      },
    ],
  },
  {
    slug: "lemon-squeezy-analytics",
    title: "Lemon Squeezy analytics in Google Sheets",
    description:
      "Lemon Squeezy analytics for indie SaaS and digital products: orders, subscriptions, refunds, and MRR synced into Google Sheets with full history backfill.",
    h1: "Lemon Squeezy analytics that stay in sync",
    lede: `Lemon Squeezy is where many indie SaaS and course businesses start. ${brand.name} pulls store orders and subscriptions into Sheets so tax models, runway sheets, and multi-store MRR share one source of truth.`,
    ogEyebrow: "Lemon Squeezy",
    ogTitle: "Lemon Squeezy analytics → Sheets",
    sections: [
      {
        h2: "Importer details",
        paragraphs: [
          "Connect with a Lemon Squeezy API key scoped to the store you want. The first run backfills historical orders; later syncs are incremental. Refunds and subscription state changes update existing rows by id.",
        ],
        bullets: [
          "One store on Free/Pro; multiple stores on Business",
          "Dashboard series color for Lemon Squeezy is ink",
          "Compatible with Lemon Squeezy API changes as long as the API remains",
        ],
      },
      {
        h2: "MRR from Lemon Squeezy subscriptions",
        paragraphs: [
          "Active subscriptions contribute to the Dashboard MRR tile. Past-due and canceled states feed churn. One-time purchases land in net revenue without inflating MRR.",
        ],
      },
      {
        h2: "Combine with other stores",
        paragraphs: [
          "If you migrated part of a catalog to Polar, or still sell packs on Gumroad, add those sources on Pro. The Dashboard stacks MRR by source so you can see which platform is carrying growth.",
        ],
      },
    ],
  },
];

export function getSeoPage(slug: string) {
  return seoPages.find((p) => p.slug === slug);
}
