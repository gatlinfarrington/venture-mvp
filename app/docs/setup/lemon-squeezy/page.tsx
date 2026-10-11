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
            Create a key and name it <code className="ui-chip">RevenueSheet</code> so you can find
            and delete it anytime. Lemon Squeezy does not offer read-only or single-store keys
            (account-level access only; see{" "}
            <a
              href="https://docs.lemonsqueezy.com/guides/developer-guide/getting-started"
              rel="noopener noreferrer"
              target="_blank"
            >
              their API getting started guide
            </a>
            ).
          </li>
          <li>Copy the key once: Lemon Squeezy will not show it again.</li>
        </ol>
        <p>
          The add-on only reads; it never creates, edits, or refunds. It calls Lemon Squeezy with
          GET requests only.
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
          Press Backfill once. The importer walks historical orders into the Orders tab, then fills
          subscriptions, customers, and refunds. Large stores may take several minutes; leave the
          sheet open until the status line shows synced.
        </p>
        <h2>Confirm the Dashboard</h2>
        <p>
          Open the Dashboard tab. MRR should reflect active Lemon Squeezy subscriptions; one-time
          sales appear in net revenue. Free plans refresh manually; Pro and Business can schedule
          hourly, every 6 hours, daily, or weekly sync.
        </p>
        <p>
          More context: <Link href="/lemon-squeezy-analytics">Lemon Squeezy analytics</Link>.
        </p>
      </div>
    </main>
  );
}
