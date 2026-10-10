import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/lib/brand";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "CSV import",
  description: `Import orders via CSV into ${brand.name} when a store has no API connector. Column mapping, backfill, and combining with Lemon Squeezy, Polar, Gumroad, or Stripe.`,
  alternates: { canonical: `${siteConfig.url}/docs/csv-import` },
};

export default function CsvImportPage() {
  return (
    <main className="docs-page">
      <p className="eyebrow">Setup</p>
      <h1>CSV import</h1>
      <div className="prose">
        <p>
          Use CSV import for stores that are not Lemon Squeezy, Polar, Gumroad, or Stripe. The
          sidebar maps columns once, then writes rows into the same Orders (and related) tabs so the
          Dashboard can stack revenue with your API sources.
        </p>
        <h2>Prepare the file</h2>
        <ol>
          <li>Export orders from your store as CSV (UTF-8).</li>
          <li>
            Include at least an order id, date, amount, and product name when available. Purchaser
            email and refund status help later QUERY work.
          </li>
          <li>Keep one header row; avoid merged cells or multiple sheets in one file.</li>
        </ol>
        <h2>Import in {brand.name}</h2>
        <p>
          Sidebar → Import CSV… → choose the file → map columns → Import. Rows land with a CSV
          source label so they stay distinct from API syncs. Re-importing the same order ids updates
          existing rows instead of duplicating when ids match.
        </p>
        <h2>Combine with API sources</h2>
        <p>
          Free allows one source (API or CSV). Pro and Business can stack CSV beside Lemon Squeezy,
          Polar, Gumroad, or Stripe so MRR and product breakdowns stay in one sheet.
        </p>
        <p>
          API connectors:{" "}
          <Link href="/docs/setup/lemon-squeezy">Lemon Squeezy</Link>
          {" · "}
          <Link href="/docs/setup/polar">Polar</Link>
          {" · "}
          <Link href="/docs/setup/gumroad">Gumroad</Link>
          {" · "}
          <Link href="/docs/setup/stripe">Stripe</Link>.
        </p>
      </div>
    </main>
  );
}
