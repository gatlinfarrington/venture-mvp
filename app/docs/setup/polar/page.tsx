import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/lib/brand";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Polar setup",
  description: `Connect Polar.sh to ${brand.name}: organization token, scopes, backfill, scheduled refresh.`,
  alternates: { canonical: `${siteConfig.url}/docs/setup/polar` },
};

export default function PolarSetupPage() {
  return (
    <main className="docs-page">
      <p className="eyebrow">Setup</p>
      <h1>Polar</h1>
      <div className="prose">
        <p>
          Polar connects with an organization access token. You need an org where you can create
          tokens with read access to orders and subscriptions.
        </p>
        <h2>1. Create a token</h2>
        <ol>
          <li>Open Polar → Settings → Access tokens (or your org’s developer settings).</li>
          <li>Create a token scoped to the organization you sell from.</li>
          <li>Grant read access to orders, subscriptions, customers, and refunds.</li>
        </ol>
        <h2>2. Connect in {brand.name}</h2>
        <p>
          Sidebar → Polar → paste the token. It is stored in your Apps Script User Properties (per
          Google account), not in sheet cells. Anyone with your Google account can use it — rotate
          the token if that account was compromised.
        </p>
        <h2>3. Backfill and schedule</h2>
        <p>
          Run Backfill once. On Pro or Business, enable scheduled refresh so Polar tabs stay current
          without opening the sheet. Free remains manual refresh for one source.
        </p>
        <p>
          Guide: <Link href="/polar-analytics">Polar analytics</Link>.
        </p>
      </div>
    </main>
  );
}
