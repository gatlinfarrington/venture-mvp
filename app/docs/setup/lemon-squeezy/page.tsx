import type { Metadata } from "next";
import Link from "next/link";
import { LaunchAvailabilityNote } from "@/components/LaunchAvailabilityNote";
import { brand } from "@/lib/brand";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Lemon Squeezy setup",
  description: `Connect Lemon Squeezy to ${brand.name}: create an API key, run backfill, read the Dashboard tab.`,
  alternates: { canonical: `${siteConfig.url}/docs/setup/lemon-squeezy` },
};

export default function LemonSetupPage() {
  return (
    <main className="docs-page">
      <p className="eyebrow">Setup</p>
      <h1>Lemon Squeezy</h1>
      <LaunchAvailabilityNote />
      <div className="prose">
        <p>
          Use this guide once you install {brand.name} (at launch). You need a Lemon Squeezy store
          you own and permission to create API keys.
        </p>
        <h2>Create an API key</h2>
        <ol>
          <li>
            Sign in to Lemon Squeezy and open <code className="ui-chip">Settings › API</code>.
          </li>
          <li>
            Lemon Squeezy doesn&apos;t document read-only or per-store API keys (see{" "}
            <a
              href="https://docs.lemonsqueezy.com/guides/developer-guide/getting-started"
              rel="noopener noreferrer"
              target="_blank"
            >
              their API getting started guide
            </a>
            ), so name the key <code className="ui-chip">RevenueSheet</code> and delete it anytime.
          </li>
          <li>Copy the key once: Lemon Squeezy will not show it again.</li>
        </ol>
        <p>
          At launch, the add-on will only read; it will never create, edit, or refund. It will call
          Lemon Squeezy with GET requests only.
        </p>
        <h2>Paste it in the add-on</h2>
        <p>
          In your Google Sheet, open{" "}
          <code className="ui-chip">Extensions › {brand.name} › Open sidebar</code>. Choose Lemon
          Squeezy and paste the key. Keys are stored in Apps Script User Properties for your Google
          account. See <Link href="/docs/api-keys">API keys</Link>.
        </p>
        <p className="mono muted">
          Keys stay in your Google account. We never receive them. Rotate anytime.{" "}
          <Link href="/security">How it works →</Link>
        </p>
        <h2>Run Backfill</h2>
        <p>
          At launch, press Backfill once. The importer will walk historical orders into the Orders
          tab, then fill subscriptions, customers, and refunds. Large stores may take several
          minutes; leave the sheet open until the status line shows synced.
        </p>
        <h2>Confirm the Dashboard</h2>
        <p>
          At launch, open the Dashboard tab. MRR should reflect active Lemon Squeezy subscriptions;
          one-time sales will appear in net revenue. Free plans will refresh manually; Pro and
          Business can schedule hourly, every 6 hours, daily, or weekly sync.
        </p>
        <p>
          More context: <Link href="/lemon-squeezy-analytics">Lemon Squeezy analytics</Link>.
        </p>
      </div>
    </main>
  );
}
