import { brand } from "@/lib/brand";

export type SeoPage = {
  slug: string;
  title: string;
  description: string;
  h1: string;
  lede: string;
  sections: Array<{ h2: string; paragraphs: string[]; bullets?: string[] }>;
};

export const seoPages: SeoPage[] = [
  {
    slug: "polar-to-google-sheets",
    title: "Polar to Google Sheets — sync orders and MRR",
    description:
      "Import Polar.sh orders, subscriptions, and refunds into Google Sheets with a scheduled sync and an MRR dashboard. Built for indie sellers who already live in spreadsheets.",
    h1: "Polar revenue, in a Google Sheet you own",
    lede: `Polar’s dashboard is fine for a single org. When you also sell on Lemon Squeezy or Gumroad — or you want QUERY formulas against every invoice — ${brand.name} backfills Polar into named tabs and keeps them on a schedule.`,
    sections: [
      {
        h2: "What syncs from Polar",
        paragraphs: [
          "The Polar importer maps orders, subscriptions, customers, and refunds into sheet tabs with stable column headers. Amounts keep Polar’s currency; the Dashboard tab rolls MRR in your sheet’s reporting currency from Settings.",
        ],
        bullets: [
          "Orders: id, created, product, email, amount, status",
          "Subscriptions: status, renewals, MRR contribution",
          "Refunds linked to the original order id",
        ],
      },
      {
        h2: "Why not Zapier alone?",
        paragraphs: [
          "Zapier and Make can append new Polar events. They do not walk Polar’s history API to rebuild last year’s orders, and they do not create an MRR / churn tab. If you need a clean backfill plus a dashboard, use an importer built for sheets.",
        ],
      },
      {
        h2: "How to connect",
        paragraphs: [
          `Install ${brand.name} from the Google Workspace Marketplace, open the sidebar, choose Polar, and paste an organization access token with read access to orders and subscriptions. Run Backfill once, then enable scheduled refresh on Pro or Business.`,
        ],
      },
    ],
  },
  {
    slug: "lemon-squeezy-to-google-sheets",
    title: "Lemon Squeezy to Google Sheets — orders, subs, MRR",
    description:
      "Sync Lemon Squeezy orders, subscriptions, customers, and refunds into Google Sheets. Full history backfill and an auto-built MRR dashboard for digital product sellers.",
    h1: "Lemon Squeezy sales, synced into Google Sheets",
    lede: `Lemon Squeezy is where many indie SaaS and course businesses start. ${brand.name} pulls store orders and subscriptions into Sheets so you can combine them with Polar or Gumroad — and keep using the spreadsheet models you already have for tax and runway.`,
    sections: [
      {
        h2: "Importer details",
        paragraphs: [
          "Connect with a Lemon Squeezy API key scoped to the store you want. The first run backfills historical orders; later syncs are incremental. Refunds and subscription state changes update existing rows by id instead of duplicating them.",
        ],
        bullets: [
          "Works with one store on Free/Pro; multiple stores on Business",
          "Dashboard series color for Lemon Squeezy is ink (#0D0D0D)",
          "Compatible with Lemon Squeezy’s ongoing platform changes as long as the API remains",
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
  {
    slug: "gumroad-to-google-sheets",
    title: "Gumroad to Google Sheets — sales spreadsheet that stays current",
    description:
      "Turn Gumroad sales into a living Google Sheet: full history, refunds, and an MRR-style dashboard when you also sell subscriptions elsewhere.",
    h1: "Gumroad sales without the CSV paste ritual",
    lede: `Gumroad’s export works until you need last month again. ${brand.name} connects with your Gumroad access token, backfills sales into an Orders tab, and refreshes on a schedule so your sheet matches the storefront.`,
    sections: [
      {
        h2: "Compared to templates and AI agents",
        paragraphs: [
          "Static Gumroad CSV templates go stale the day after you paste. Third-party “AI agent” sheet products often charge SaaS prices for the same append job. This add-on is built for sellers who want rows and formulas, not another chat UI.",
        ],
      },
      {
        h2: "What you get",
        paragraphs: [
          "Sales rows with product, purchaser email, amount, and refund status. If you only sell one-time products on Gumroad, MRR still rolls up correctly from your other connected sources while Gumroad contributes net revenue and product breakdowns.",
        ],
        bullets: [
          "Manual refresh on Free (one source)",
          "Hourly schedule on Pro when Gumroad is combined with Polar or Lemon Squeezy",
          "Example data on the marketing site is labeled — your sheet uses your store",
        ],
      },
      {
        h2: "Setup",
        paragraphs: [
          `Install ${brand.name}, paste a Gumroad token with sales read access, run Backfill, and pin the Dashboard tab. Share the sheet with your accountant without inviting them into Gumroad.`,
        ],
      },
    ],
  },
  {
    slug: "mrr-spreadsheet-template",
    title: "MRR spreadsheet template for Google Sheets",
    description:
      "A free MRR spreadsheet structure for Google Sheets: KPI tiles, source breakdown, and order tabs — filled automatically when you connect Lemon Squeezy, Polar, or Gumroad.",
    h1: "An MRR spreadsheet template that fills itself",
    lede: `Most MRR templates ask you to paste numbers every Monday. ${brand.name} ships the same sheet structure — KPIs, stacked MRR by source, churn, revenue by product — and writes the rows from your stores so the template stays honest.`,
    sections: [
      {
        h2: "What is in the template",
        paragraphs: [
          "Dashboard tab with MRR, net revenue (30d), active subscriptions, and churn. Charts use Inter Tight and JetBrains Mono with brand series colors: Lemon Squeezy ink, Polar signal green, Gumroad gray. Data tabs freeze header rows and protect synced ranges.",
        ],
        bullets: [
          "Named ranges: rs_orders, rs_subs, rs_mrr_monthly",
          "Currency formats from Settings",
          "Footnote labels example vs live sync timestamps",
        ],
      },
      {
        h2: "How to use it free",
        paragraphs: [
          "Install the add-on, connect one source, and run a manual refresh. You get the full tab layout and history backfill. Upgrade to Pro when you want hourly sync or a second source.",
        ],
      },
      {
        h2: "Not a fake sample file",
        paragraphs: [
          "Marketing screenshots show labeled example data. Your installed sheet starts empty of customer PII until you connect a store — no invented logos or testimonials required.",
        ],
      },
    ],
  },
];

export function getSeoPage(slug: string) {
  return seoPages.find((p) => p.slug === slug);
}
