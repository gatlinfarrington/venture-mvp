import type { Metadata } from "next";
import Link from "next/link";
import { InstallCta } from "@/components/InstallCta";
import { LaunchInvite } from "@/components/LaunchInvite";
import { brand, marketplaceUrl } from "@/lib/brand";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "vs Polar’s dashboard",
  description: `Polar’s built-in analytics covers Polar. ${brand.name} combines Polar, Lemon Squeezy, Gumroad and Stripe in a Google Sheet you own.`,
  alternates: { canonical: `${siteConfig.url}/vs/polar-dashboard` },
  openGraph: {
    title: `vs Polar’s dashboard · ${brand.name}`,
    description: `Polar shows Polar. ${brand.name} adds Lemon Squeezy, Gumroad and Stripe into one sheet.`,
    url: `${siteConfig.url}/vs/polar-dashboard`,
  },
};

const checkedOn = "2026-10-10";

type Cell = string | boolean;

const rows: Array<{ feature: string; us: Cell; polar: Cell; lemon: Cell }> = [
  {
    feature: "Built-in MRR analytics",
    us: "MRR dashboard tab in your Sheet",
    polar: "Yes (Analytics dashboard)",
    lemon: "Dashboard charts; per-customer MRR via API",
  },
  {
    feature: "Where data lives",
    us: "Your Google Sheet",
    polar: "Polar cloud",
    lemon: "Lemon Squeezy cloud",
  },
  {
    feature: "Combines Polar + Lemon Squeezy + Gumroad + Stripe",
    us: true,
    polar: "Polar only",
    lemon: "Lemon Squeezy only",
  },
  {
    feature: "Your own QUERY / formulas on raw rows",
    us: true,
    polar: "Their Analytics UI / Metrics API",
    lemon: "Their dashboard / Customer API",
  },
];

function cellClass(value: Cell, side: "us" | "them"): string {
  if (value === true) return side === "us" ? "yes" : "yes-ink";
  if (value === false) return "no";
  return side === "us" ? "yes-ink" : "";
}

function cellText(value: Cell): string {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return value;
}

export default function PolarDashboardComparePage() {
  const listing = marketplaceUrl();

  return (
    <main className="seo-page container page-shell vs-polar-page">
      <div className="vs-polar-hero">
        <div className="vs-polar-hero-copy">
          <p className="eyebrow">RevenueSheet vs Polar’s dashboard</p>
          <h1 className="vs-polar-h1">
            Polar’s MRR is great.
            <br />
            Until you also sell on Gumroad.
          </h1>
          <p className="body-lg muted page-lede vs-polar-lede">
            Polar shows Polar. Lemon Squeezy shows Lemon Squeezy. RevenueSheet adds them up in a
            sheet you own, with the formulas left open.
          </p>
          <div className="vs-polar-ctas">
            {listing ? (
              <InstallCta className="btn btn-primary" source="vs-polar-dashboard">
                Install for Google Sheets
              </InstallCta>
            ) : (
              <LaunchInvite id="launch" source="vs-polar-dashboard" />
            )}
            <Link className="vs-polar-ghost" href="/docs/mrr-and-churn">
              How we calculate MRR →
            </Link>
          </div>
        </div>

        <figure className="vs-combined-table" aria-label="Example combined MRR by store">
          <table>
            <tbody>
              <tr>
                <td className="mono">Polar</td>
                <td className="mono n">$1,640</td>
              </tr>
              <tr>
                <td className="mono">Lemon Squeezy</td>
                <td className="mono n">$1,210</td>
              </tr>
              <tr>
                <td className="mono">Gumroad</td>
                <td className="mono n">$770</td>
              </tr>
              <tr className="vs-combined-total">
                <td>
                  <span className="vs-combined-dot" aria-hidden="true" />
                  Combined MRR
                </td>
                <td className="mono n">$3,620</td>
              </tr>
            </tbody>
          </table>
          <figcaption className="mono muted">Example data</figcaption>
        </figure>
      </div>

      <div className="compare-wrap vs-polar-compare">
        <table className="compare-table compare-table-3">
          <thead>
            <tr>
              <th>Capability</th>
              <th>{brand.name}</th>
              <th>Polar dashboard</th>
              <th>Lemon Squeezy dashboard</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.feature}>
                <td>{row.feature}</td>
                <td data-label={brand.name} className={cellClass(row.us, "us")}>
                  {cellText(row.us)}
                </td>
                <td data-label="Polar dashboard" className={cellClass(row.polar, "them")}>
                  {cellText(row.polar)}
                </td>
                <td data-label="Lemon Squeezy dashboard" className={cellClass(row.lemon, "them")}>
                  {cellText(row.lemon)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="prose" style={{ marginTop: "var(--space-10)" }}>
        <h2>When Polar’s dashboard fits</h2>
        <p>
          You sell only on Polar and want their built-in Analytics metrics (including MRR normalized
          to a monthly rate) without leaving Polar.
        </p>
        <h2>When Lemon Squeezy’s dashboard fits</h2>
        <p>
          You sell only on Lemon Squeezy and the store dashboard charts (and per-customer MRR in
          their API) cover what you need.
        </p>
        <h2>When {brand.name} fits</h2>
        <p>
          You sell in more than one place, or you want the rows and formulas in a Google Sheet you
          already share with an accountant or cofounder.
        </p>

        <h2>Sources</h2>
        <ul>
          <li>
            <a href="https://polar.sh/docs/features/analytics" rel="noopener noreferrer" target="_blank">
              Polar Analytics
            </a>
            : documents a built-in Analytics dashboard with Monthly Recurring Revenue (yearly plans
            divided by 12). Checked {checkedOn}.
          </li>
          <li>
            <a
              href="https://docs.lemonsqueezy.com/guides/getting-started"
              rel="noopener noreferrer"
              target="_blank"
            >
              Lemon Squeezy Getting Started
            </a>
            : dashboard shows business-related charts such as recent revenue and customer numbers.
            Checked {checkedOn}.
          </li>
          <li>
            <a
              href="https://docs.lemonsqueezy.com/api/customers/the-customer-object"
              rel="noopener noreferrer"
              target="_blank"
            >
              Lemon Squeezy Customer object
            </a>
            : exposes per-customer <code>mrr</code> / <code>mrr_formatted</code>. Checked {checkedOn}.
          </li>
          <li>
            {brand.name} pricing: Free $0, Pro $9/mo, Business $19/mo, billed monthly. See{" "}
            <Link href="/pricing">/pricing</Link>.
          </li>
        </ul>
        <p className="mono muted">Sources checked {checkedOn}.</p>
      </div>
    </main>
  );
}
