import type { Metadata } from "next";
import Link from "next/link";
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
      <div className="prose">
        <p>
          Use this guide after installing {brand.name} from the Google Workspace Marketplace. You
          need a Lemon Squeezy store you own and permission to create API keys.
        </p>
        <h2>1. Create an API key</h2>
        <ol>
          <li>Sign in to Lemon Squeezy → Settings → API.</li>
          <li>Create a key with read access to orders, subscriptions, customers, and refunds.</li>
          <li>Copy the key once — Lemon Squeezy will not show it again.</li>
        </ol>
        <h2>2. Paste it in the add-on</h2>
        <p>
          Open your Google Sheet → Extensions → {brand.name} → Open sidebar. Choose Lemon Squeezy
          and paste the key. Keys are stored in Apps Script User Properties for your Google account
          — see <Link href="/docs/api-keys">API keys</Link>.
        </p>
        <h2>3. Run Backfill</h2>
        <p>
          Click Backfill once. The importer walks historical orders into the Orders tab, then fills
          subscriptions, customers, and refunds. Large stores may take several minutes; leave the
          sheet open until the status line shows synced.
        </p>
        <h2>4. Confirm the Dashboard</h2>
        <p>
          Open the Dashboard tab. MRR should reflect active Lemon Squeezy subscriptions; one-time
          sales appear in net revenue. Free plans refresh manually; Pro and Business can schedule
          hourly sync.
        </p>
        <p>
          More context: <Link href="/lemon-squeezy-analytics">Lemon Squeezy analytics</Link>.
        </p>
      </div>
    </main>
  );
}
