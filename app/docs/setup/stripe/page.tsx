import type { Metadata } from "next";
import Link from "next/link";
import { LaunchAvailabilityNote } from "@/components/LaunchAvailabilityNote";
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
      <LaunchAvailabilityNote />
      <div className="prose">
        <p>
          Use this guide once you install {brand.name} (at launch). Stripe connects with a{" "}
          <strong>restricted API key</strong> scoped to read-only access. Do not paste a secret key
          that can write charges or change account settings.
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
            Refunds. Leave write permissions off.
          </li>
          <li>Save the key in your password manager before you paste it.</li>
        </ol>
        <p>
          The add-on only reads; it never creates, edits, or refunds. It calls Stripe with GET
          requests only.
        </p>
        <h2>Connect in {brand.name}</h2>
        <p>
          In your Google Sheet, open{" "}
          <code className="ui-chip">Extensions › {brand.name} › Open sidebar</code>. Choose Stripe,
          paste the restricted key, and save. It is stored in Apps Script User Properties for your
          Google account, not in sheet cells.
        </p>
        <p className="mono muted">
          Keys stay in your Google account. We never receive them. Rotate anytime.{" "}
          <Link href="/security">How it works →</Link>
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
