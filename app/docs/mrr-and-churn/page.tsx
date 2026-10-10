import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/lib/brand";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "How we calculate MRR and churn",
  description: `How ${brand.name} turns subscription intervals into monthly recurring revenue and logo churn, generated from the add-on metrics code.`,
  alternates: { canonical: `${siteConfig.url}/docs/mrr-and-churn` },
};

export default function MrrAndChurnDocsPage() {
  return (
    <main className="docs-page">
      <p className="eyebrow">Docs</p>
      <h1>How we calculate MRR and churn</h1>
      <p className="body-lg muted docs-lede">
        Plain-language summary of <code>addon/src/lib/intervals.ts</code> and{" "}
        <code>addon/src/metrics/churn.ts</code> (plus the MRR eligibility rules in{" "}
        <code>addon/src/metrics/mrr.ts</code>).
      </p>

      <div className="prose">
        <h2>MRR</h2>
        <p>
          Monthly recurring revenue is the sum of each eligible subscription’s billed amount
          converted to a monthly rate. Conversion lives in <code>toMonthlyAmount</code> /{" "}
          <code>toMonthlyFromUnitCount</code>:
        </p>
        <ul>
          <li>Monthly → as billed</li>
          <li>Quarterly → amount ÷ 3</li>
          <li>Biannual (twice a year) → amount ÷ 6</li>
          <li>Yearly / annual → amount ÷ 12</li>
          <li>Biennial (every two years) → amount ÷ 24</li>
          <li>Weekly → amount × 52 ÷ 12</li>
          <li>Daily → amount × 365 ÷ 12</li>
        </ul>
        <p>
          Vendor strings are normalized first (<code>normalizeBillingInterval</code>,{" "}
          <code>intervalFromUnitAndCount</code>) so Lemon Squeezy{" "}
          <code>interval</code> + <code>interval_count</code> (for example month × 3) and Gumroad
          quarterly / yearly labels map to the same periods.
        </p>
        <p>
          By default only subscriptions with status <code>active</code> count toward total MRR.
          Trialing and past-due can be included when that option is turned on in the sidebar (
          <code>includeTrialingPastDue</code>).
        </p>

        <h2>Churn</h2>
        <p>
          Logo churn over a trailing window (default 30 days) ending at “now”:
        </p>
        <p>
          <code>rate = cancelled_in_window ÷ active_at_window_start</code>
        </p>
        <p>
          A subscription counts as active at the window start if it was created before the window
          and had not cancelled before that start. Cancellations inside the window increment the
          numerator. The same math on the previous window produces <code>deltaPts</code>{" "}
          (percentage-point change).
        </p>
        <p>
          This is customer (logo) churn, not dollar churn. New subscriptions in the window are
          tracked separately as <code>newSubs</code>.
        </p>

        <h2>Related</h2>
        <ul>
          <li>
            <Link href="/docs/api-keys">API keys</Link>
          </li>
          <li>
            <Link href="/security">Security</Link>
          </li>
          <li>
            <Link href="/vs/polar-dashboard">vs Polar’s dashboard</Link>
          </li>
        </ul>
      </div>
    </main>
  );
}
