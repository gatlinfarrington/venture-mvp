import type { Metadata } from "next";
import Link from "next/link";
import { brand, siteHostname } from "@/lib/brand";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Troubleshooting",
  description: `Fix empty tabs, auth errors, rate limits, and license issues in ${brand.name}.`,
  alternates: { canonical: `${siteConfig.url}/docs/troubleshooting` },
};

export default function TroubleshootingPage() {
  return (
    <main className="docs-page">
      <p className="eyebrow">Help</p>
      <h1>Troubleshooting</h1>
      <div className="prose">
        <h2>Tabs are empty after Backfill</h2>
        <ul>
          <li>Confirm the API key belongs to the store that has orders.</li>
          <li>Check the sidebar status line for auth or rate-limit errors.</li>
          <li>Re-run Backfill once; leave the sheet open until sync finishes.</li>
        </ul>
        <h2>Unauthorized or 401 from a source</h2>
        <ul>
          <li>Regenerate the token at the source and paste the new value.</li>
          <li>Confirm the token includes read scopes for orders and subscriptions.</li>
          <li>Remove accidental whitespace when pasting.</li>
        </ul>
        <h2>Rate limited</h2>
        <p>
          Large first backfills can hit source API limits. Wait for the cooldown suggested in the
          status line, then resume. Scheduled sync on Pro uses smaller incremental windows.
        </p>
        <h2>License not recognized</h2>
        <ul>
          <li>
            Once paid plans open, paste the license key from the success page or your receipt email.
          </li>
          <li>Confirm you are online: verify calls {siteHostname()}.</li>
          <li>
            Still failing after purchase? See <Link href="/support">Support</Link> with the checkout
            session id from your receipt.
          </li>
        </ul>
        <h2>Wrong MRR number</h2>
        <p>
          MRR only counts active subscriptions. One-time Gumroad or Lemon Squeezy sales belong in
          net revenue. Check Settings currency and whether canceled subs are still marked active at
          the source.
        </p>
        <p>
          Setup guides: <Link href="/docs">Docs home</Link> ·{" "}
          <Link href="/docs/api-keys">API keys</Link> · <Link href="/support">Support</Link>
        </p>
      </div>
    </main>
  );
}
