import type { Metadata } from "next";
import Link from "next/link";
import { InstallCta } from "@/components/InstallCta";
import { brand } from "@/lib/brand";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: `Why ${brand.name} puts Lemon Squeezy, Polar, and Gumroad revenue in a Google Sheet you own instead of another dashboard SaaS.`,
  alternates: { canonical: `${siteConfig.url}/about` },
  openGraph: {
    title: `About · ${brand.name}`,
    description: `The product story behind ${brand.name}: revenue in a sheet you own.`,
    url: `${siteConfig.url}/about`,
  },
};

export default function AboutPage() {
  return (
    <main className="legal container page-shell">
      <p className="eyebrow">Company</p>
      <h1>About {brand.name}</h1>
      <p className="body-lg muted page-lede">
        Every storefront ships its own dashboard. {brand.name} puts your orders back in the
        spreadsheet you already run the business from.
      </p>

      <div className="prose">
        <h2>The problem storefront dashboards leave open</h2>
        <p>
          Lemon Squeezy, Polar, and Gumroad each answer “what sold today.” None of them is the
          runway model, the tax worksheet, or the investor update you already maintain in Sheets.
        </p>
        <p>
          Exporting CSVs works until Monday, when the paste is already stale. Append-only
          automations add new rows but rarely rebuild history or MRR. Hosted analytics suites are
          excellent when you want their cloud product; they are the wrong shape when the sheet is
          already the system of record.
        </p>

        <h2>Why a sheet you own</h2>
        <p>
          {brand.name} is a Google Sheets add-on. You connect a source with an API key, run a
          backfill, and get named tabs (orders, subscriptions, customers, refunds) plus a dashboard
          tab for MRR, churn, and revenue by product. Free covers one source with manual refresh;
          Pro schedules sync across connected storefronts.
        </p>
        <p>
          You keep QUERY, FILTER, and the models you already trust. You share the file with an
          accountant without inviting them into every seller dashboard. When a platform changes its
          UI, the rows are still yours.
        </p>

        <h2>What this is not</h2>
        <ul>
          <li>Not another chart SaaS that replaces your spreadsheet</li>
          <li>Not a Zap that only appends today’s events</li>
        </ul>
        <p>
          It is an importer and a dashboard tab for people who already live in spreadsheets.{" "}
          <Link href="/docs">Docs</Link>
          {" · "}
          <Link href="/pricing">Pricing</Link>
          {" · "}
          <Link href="/security">Security</Link>.
        </p>

        <p>
          <InstallCta className="btn btn-primary" source="about">
            Join the launch list
          </InstallCta>
        </p>
      </div>
    </main>
  );
}
