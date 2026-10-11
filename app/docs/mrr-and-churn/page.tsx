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
        Plain-language summary of <code>addon/src/lib/intervals.ts</code>,{" "}
        <code>addon/src/metrics/churn.ts</code>, <code>addon/src/metrics/mrr.ts</code>, and{" "}
        <code>addon/src/metrics/refunds.ts</code>.
      </p>

      <div className="prose">
        <h2>MRR</h2>
        <p>
          Monthly recurring revenue is the sum of each eligible subscription’s billed amount
          converted to a monthly rate. Conversion lives in <code>toMonthlyAmount</code> /{" "}
          <code>toMonthlyFromUnitCount</code>:
        </p>
        <ul>
          <li>Monthly: as billed</li>
          <li>Quarterly: amount divided by 3</li>
          <li>Biannual (twice a year): amount divided by 6</li>
          <li>Yearly / annual: amount divided by 12</li>
          <li>Biennial (every two years): amount divided by 24</li>
          <li>Weekly: amount times 52, divided by 12</li>
          <li>Daily: amount times 365, divided by 12</li>
        </ul>
        <p>
          Vendor strings are normalized first (<code>normalizeBillingInterval</code>,{" "}
          <code>intervalFromUnitAndCount</code>) so Lemon Squeezy{" "}
          <code>interval</code> + <code>interval_count</code> (for example month times 3) and
          Gumroad quarterly / yearly labels map to the same periods.
        </p>
        <p>
          By default only subscriptions with status <code>active</code> count toward total MRR.
          Paused subscriptions are not included.
        </p>

        <h2>Why your MRR may differ from Polar’s</h2>
        <p>
          Polar’s public Analytics docs define MRR as the sum of every ongoing subscription’s net
          amount, normalized monthly (yearly plans divided by 12). Trialing subscriptions are
          excluded. Paused and past-due subscriptions are included until the subscription actually
          ends (
          <a
            href="https://polar.sh/docs/features/analytics"
            rel="noopener noreferrer"
            target="_blank"
          >
            Polar Analytics
          </a>
          , checked 2026-10-11).
        </p>
        <p>
          {brand.name} defaults the other way: only <code>active</code> counts toward total MRR.
          Paused is out. Past-due and trialing stay out unless you turn on the sidebar toggle{" "}
          <code>includeTrialingPastDue</code>, which adds those statuses into the total. We also
          combine Polar with other stores in one sheet, so a combined figure will not match Polar’s
          Polar-only dashboard even when eligibility rules align.
        </p>

        <h2>Refunds</h2>
        <p>
          Refund summary math lives in <code>computeRefundSummary</code> (
          <code>addon/src/metrics/refunds.ts</code>). Over a trailing window (default 30 days):
        </p>
        <ul>
          <li>
            Refund amount and count sum every refund row whose <code>created</code> timestamp falls
            inside the window.
          </li>
          <li>
            Order revenue for the rate sums order amounts in the same window, skipping orders with
            status <code>failed</code>.
          </li>
          <li>
            Refund rate is refund amount divided by order revenue (0 when order revenue is 0).
          </li>
        </ul>
        <p>
          That helper does not special-case chargebacks. Separately, when the add-on builds a 30-day
          net revenue figure for the dashboard (
          <code>sumNetRevenue30d</code> in <code>addon/src/sync.ts</code>), it skips orders marked{" "}
          <code>refunded</code>, <code>chargeback</code>, or <code>failed</code>, then subtracts
          refund amounts in the window. Refund and chargeback rows also land on the Refunds tab from
          each source importer when the API returns them.
        </p>
        <p>
          MRR itself is subscription-based. Refund and chargeback totals do not change an active
          subscription’s monthly contribution until that subscription’s status or amount changes on
          the next sync.
        </p>

        <h2>Churn</h2>
        <p>Logo churn over a trailing window (default 30 days) ending at “now”:</p>
        <p>
          <code>rate = cancelled_in_window / active_at_window_start</code>
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
