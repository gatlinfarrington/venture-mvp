import type { Metadata } from "next";
import Link from "next/link";
import { LaunchAvailabilityNote } from "@/components/LaunchAvailabilityNote";
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
      <LaunchAvailabilityNote />
      <div className="prose">
        <p>
          Use this guide once you install {brand.name} (at launch). Polar connects with an
          organization access token. You need an org where you can create tokens with read access to
          orders and subscriptions.
        </p>
        <h2>Create a token</h2>
        <ol>
          <li>
            Open Polar and go to{" "}
            <code className="ui-chip">Settings › Access tokens</code> (or your org’s developer
            settings).
          </li>
          <li>Create a token scoped to the organization you sell from.</li>
          <li>Grant read access to orders, subscriptions, customers, and refunds.</li>
        </ol>
        <p>
          The add-on only reads; it never creates, edits, or refunds. It calls Polar with GET
          requests only.
        </p>
        <h2>Connect in {brand.name}</h2>
        <p>
          Open the {brand.name} sidebar, choose Polar, paste the token, then save. It is stored in
          your Apps Script User Properties (per Google account), not in sheet cells. Anyone with your
          Google account can use it. Rotate the token if that account was compromised.
        </p>
        <p className="mono muted">
          Keys stay in your Google account. We never receive them. Rotate anytime.{" "}
          <Link href="/security">How it works →</Link>
        </p>
        <h2>Backfill and schedule</h2>
        <p>
          Press Backfill once. On Pro or Business, enable scheduled refresh so Polar tabs stay
          current without opening the sheet. Free remains manual refresh for one source. Multiple
          Polar orgs need separate tokens and a Business plan (up to 20 stores).
        </p>
        <p>
          Guide: <Link href="/polar-analytics">Polar analytics</Link>.
        </p>
      </div>
    </main>
  );
}
