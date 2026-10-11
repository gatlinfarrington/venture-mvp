import type { Metadata } from "next";
import Link from "next/link";
import { LaunchAvailabilityNote } from "@/components/LaunchAvailabilityNote";
import { brand } from "@/lib/brand";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Gumroad setup",
  description: `Connect Gumroad to ${brand.name}: access token, sales history, refunds, combining sources.`,
  alternates: { canonical: `${siteConfig.url}/docs/setup/gumroad` },
};

/** Token path aligned with https://gumroad.com/help/article/280-create-application-api and the MRR blog. */
export const gumroadTokenSteps = [
  <>
    Sign in to Gumroad and open <code className="ui-chip">Settings › Advanced</code>.
  </>,
  <>
    Create an application. Name it <code className="ui-chip">RevenueSheet</code>. For your own
    account, Redirect URI can be <code className="ui-chip">http://127.0.0.1</code>.
  </>,
  <>
    Open the application and click <strong>Generate access token</strong>. Copy it and treat it like
    a password.
  </>,
] as const;

export default function GumroadSetupPage() {
  return (
    <main className="docs-page">
      <p className="eyebrow">Setup</p>
      <h1>Gumroad</h1>
      <LaunchAvailabilityNote />
      <div className="prose">
        <p>
          Use this guide once you install {brand.name} (at launch). Memberships count toward MRR,
          normalized monthly; one-time sales go to net revenue.
        </p>
        <h2>Create an access token</h2>
        <ol>
          {gumroadTokenSteps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
        <p>
          The add-on only reads; it never creates, edits, or refunds. It calls Gumroad with GET
          requests only.
        </p>
        <h2>Connect and backfill</h2>
        <p>
          Open the {brand.name} sidebar, choose Gumroad, paste the token, then press Backfill. Sales
          land in Orders with product, email, amount, and refund status. Re-running sync updates
          refunded rows instead of duplicating.
        </p>
        <p className="mono muted">
          Keys stay in your Google account. We never receive them. Rotate anytime.{" "}
          <Link href="/security">How it works →</Link>
        </p>
        <h2>Combine with other stores</h2>
        <p>
          Free allows one source. Upgrade to Pro to add Polar or Lemon Squeezy beside Gumroad so the
          Dashboard stacks revenue by source.
        </p>
        <p>
          Guide: <Link href="/gumroad-analytics-google-sheets">Gumroad analytics</Link>.
        </p>
      </div>
    </main>
  );
}
