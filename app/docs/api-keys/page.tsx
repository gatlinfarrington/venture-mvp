import type { Metadata } from "next";
import { brand, siteHostname } from "@/lib/brand";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "API keys",
  description: `How ${brand.name} stores source API keys, how to rotate them, and what never leaves your Google Sheet.`,
  alternates: { canonical: `${siteConfig.url}/docs/api-keys` },
};

export default function ApiKeysPage() {
  return (
    <main className="docs-page">
      <p className="eyebrow">Security</p>
      <h1>API keys</h1>
      <div className="prose">
        <p>
          Source keys (Lemon Squeezy, Polar, Gumroad, or Stripe) are required for sync. Treat them
          like passwords for your storefront data.
        </p>
        <h2>Where keys are stored</h2>
        <p>
          When you paste a key in the sidebar, {brand.name} writes it to Apps Script User Properties
          for your Google account (not into sheet cells). Keys are not sent to {siteHostname()}{" "}
          marketing servers and are not stored in our license database. Sync calls go from Apps
          Script to the source APIs directly.
        </p>
        <h2>License keys vs source keys</h2>
        <p>
          A <strong>license key</strong> from Checkout proves your Free / Pro / Business tier. A{" "}
          <strong>source API key</strong> proves access to Lemon Squeezy, Polar, Gumroad, or Stripe.
          They are different credentials: never paste a license key into a source field or the
          reverse.
        </p>
        <h2>Rotation</h2>
        <ol>
          <li>Create a new token in the source dashboard.</li>
          <li>Paste it in the {brand.name} sidebar and save.</li>
          <li>Revoke the old token at the source.</li>
        </ol>
        <p>
          Rotate immediately if a spreadsheet was shared with Edit access to people who should not
          see store data, or if a laptop with an open sheet was lost.
        </p>
        <h2>What we never ask for</h2>
        <ul>
          <li>Google account passwords</li>
          <li>Stripe secret keys for your customer payments (Checkout for {brand.name} licenses is separate)</li>
          <li>Gmail, Contacts, or broad Google Drive scopes</li>
        </ul>
      </div>
    </main>
  );
}
