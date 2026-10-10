import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/lib/brand";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Gumroad setup",
  description: `Connect Gumroad to ${brand.name}: access token, sales history, refunds, combining sources.`,
  alternates: { canonical: `${siteConfig.url}/docs/setup/gumroad` },
};

export default function GumroadSetupPage() {
  return (
    <main className="docs-page">
      <p className="eyebrow">Setup</p>
      <h1>Gumroad</h1>
      <div className="prose">
        <p>
          Gumroad uses an access token with sales read permission. One-time products contribute net
          revenue; subscription-style products on other sources still drive MRR on the Dashboard.
        </p>
        <h2>1. Create an access token</h2>
        <ol>
          <li>Sign in to Gumroad → Settings → Advanced → Application tokens (or equivalent).</li>
          <li>Create a token that can read sales.</li>
          <li>Copy it into a password manager before pasting into the add-on.</li>
        </ol>
        <h2>2. Connect and backfill</h2>
        <p>
          Sidebar → Gumroad → paste token → Backfill. Sales land in Orders with product, email,
          amount, and refund status. Re-running sync updates refunded rows instead of duplicating.
        </p>
        <h2>3. Combine with other stores</h2>
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
