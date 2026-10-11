import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/lib/brand";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "How we calculate MRR and churn",
  description: `How ${brand.name} turns subscription intervals into monthly recurring revenue and logo churn.`,
  alternates: { canonical: `${siteConfig.url}/docs/mrr-and-churn` },
};

export default function MrrAndChurnDocsPage() {
  return (
    <main className="docs-page">
      <p className="eyebrow">Docs</p>
      <h1>How we calculate MRR and churn</h1>
      <p className="body-lg muted docs-lede">
        How {brand.name} turns subscription intervals into monthly recurring revenue and logo churn.
      </p>

      <div className="prose">
        <h2>MRR</h2>
        <p>
          Monthly recurring revenue is the sum of each eligible subscription’s billed amount
          converted to a monthly rate:
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
          Vendor interval labels are normalized first so Lemon Squeezy month-plus-count plans (for
          example month times 3) and Gumroad quarterly / yearly labels map to the same periods.
        </p>
        <p>
          By default only subscriptions with status active count toward total MRR. Paused
          subscriptions are not included.
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
          {brand.name} defaults the other way: only active counts toward total MRR. Paused is out.
          Past-due and trialing stay out unless you turn on the sidebar toggle{" "}
          <strong>Include trialing + past due in MRR</strong>, which adds those statuses into the
          total. We also combine Polar with other stores in one sheet, so a combined figure will not
          match Polar’s Polar-only dashboard even when eligibility rules align.
        </p>

        <h2>Refunds</h2>
        <p>Over a trailing window (default 30 days):</p>
        <ul>
          <li>
            Refund amount and count sum every refund row whose created timestamp falls inside the
            window.
          </li>
          <li>
            Order revenue for the rate sums order amounts in the same window, skipping failed
            orders.
          </li>
          <li>
            Refund rate is refund amount divided by order revenue (0 when order revenue is 0).
          </li>
        </ul>
        <p>
          That summary does not special-case chargebacks. Separately, when the add-on builds a
          30-day net revenue figure for the dashboard, it skips orders marked refunded, chargeback,
          or failed, then subtracts refund amounts in the window. Refund and chargeback rows also
          land on the Refunds tab from each source importer when the API returns them.
        </p>
        <p>
          MRR itself is subscription-based. Refund and chargeback totals do not change an active
          subscription’s monthly contribution until that subscription’s status or amount changes on
          the next sync.
        </p>

        <h2>Churn</h2>
        <p>Logo churn over a trailing window (default 30 days) ending at “now”:</p>
        <p>
          rate = cancellations in the window ÷ subscriptions that were active at the window start
        </p>
        <p>
          A subscription counts as active at the window start if it was created before the window
          and had not cancelled before that start. Cancellations inside the window increment the
          numerator. The same math on the previous window produces the percentage-point change shown
          on the dashboard.
        </p>
        <p>
          This is customer (logo) churn, not dollar churn. New subscriptions in the window are
          tracked separately.
        </p>

        <details className="docs-footnote">
          <summary>For the curious</summary>
          <p>
            Interval conversion: <code>toMonthlyAmount</code> /{" "}
            <code>toMonthlyFromUnitCount</code> in <code>addon/src/lib/intervals.ts</code>, with
            vendor strings via <code>normalizeBillingInterval</code> and{" "}
            <code>intervalFromUnitAndCount</code>.
          </p>
          <p>
            Sidebar toggle <strong>Include trialing + past due in MRR</strong> maps to{" "}
            <code>includeTrialingPastDue</code> in <code>addon/src/metrics/mrr.ts</code>.
          </p>
          <p>
            Refund summary: <code>computeRefundSummary</code> in{" "}
            <code>addon/src/metrics/refunds.ts</code>. Dashboard net revenue:{" "}
            <code>sumNetRevenue30d</code> in <code>addon/src/sync.ts</code>.
          </p>
          <p>
            Logo churn: <code>cancelled_in_window / active_at_window_start</code> in{" "}
            <code>addon/src/metrics/churn.ts</code>.
          </p>
        </details>

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
