import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/lib/brand";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Stripe setup",
  description: `Connect Stripe to ${brand.name}: create a restricted key with read-only scopes, run backfill, read the Dashboard tab.`,
  alternates: { canonical: `${siteConfig.url}/docs/setup/stripe` },
};

export default function StripeSetupPage() {
  return (
    <main className="docs-page">
      <p className="eyebrow">Setup</p>
      <h1>Stripe</h1>
      <div className="prose">
        <p>
          Stripe connects with a <strong>restricted API key</strong> scoped to read-only access. Do
          not paste a secret key that can write charges or change account settings.
        </p>
        <h2>Create a restricted key</h2>
        <ol>
          <li>
            Sign in to Stripe and open{" "}
            <code className="ui-chip">
              Developers › API keys › Restricted keys › Create restricted key
            </code>
            .
          </li>
          <li>
            Grant <strong>Read</strong> access for Charges, Customers, Subscriptions, Invoices, and
            Refunds (or the closest matching resources in your Dashboard). Leave write permissions
            off.
          </li>
          <li>Copy the key once into a password manager before pasting into the add-on.</li>
        </ol>
        <h2>Connect in {brand.name}</h2>
        <p>
          In your Google Sheet, open{" "}
          <code className="ui-chip">Extensions › {brand.name} › Open sidebar</code>. Choose Stripe,
          paste the restricted key, and save. It is stored in Apps Script User Properties for your
          Google account, not in sheet cells.
        </p>
        <h2>Backfill and schedule</h2>
        <p>
          Press Backfill once. Charges land as orders; subscriptions contribute to MRR on the
          Dashboard tab. On Pro or Business, enable scheduled refresh so Stripe tabs stay current.
          Free remains manual refresh for one source.
        </p>
        <p>
          Guide: <Link href="/stripe-to-google-sheets">Stripe to Google Sheets</Link>. For stores
          without an API, see <Link href="/docs/csv-import">CSV import</Link>.
        </p>
      </div>
    </main>
  );
}
