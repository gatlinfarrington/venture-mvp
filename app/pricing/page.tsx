import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { LaunchInvite } from "@/components/LaunchInvite";
import { Pricing } from "@/components/Pricing";
import { brand } from "@/lib/brand";
import { REFUND_LINE } from "@/lib/copy";
import { pricing, siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Free for one source. Pro $9/mo, Business $19/mo, billed monthly. Refresh hourly, every 6 hours, daily or weekly.",
  alternates: { canonical: `${siteConfig.url}/pricing` },
  openGraph: {
    title: `Pricing · ${brand.name}`,
    description:
      "Free for one source. Pro $9/mo, Business $19/mo, billed monthly. Refresh hourly, every 6 hours, daily or weekly.",
    url: `${siteConfig.url}/pricing`,
  },
};

const includes = [
  "Data written to your own Google Sheet",
  "Named tabs: Orders, Subscriptions, Customers, Refunds, Dashboard",
  "Full history backfill on every plan",
  "Named ranges for formulas (rs_orders and friends)",
];

const compareRows = [
  {
    label: "Sources",
    free: String(pricing.free.sources),
    pro: "All four sources plus CSV import",
    business: "All four sources plus CSV import",
  },
  {
    label: "Refresh",
    free: pricing.free.refresh,
    pro: pricing.pro.refresh,
    business: pricing.business.refresh,
  },
  {
    label: "Stores per source",
    free: String(pricing.free.stores),
    pro: String(pricing.pro.stores),
    business: String(pricing.business.stores),
  },
  {
    label: "Support",
    free: "Help docs and support form",
    pro: "Help docs and support form",
    business: "Help docs and support form",
  },
];

const faq: Array<{ q: string; a: ReactNode }> = [
  {
    q: "When do paid plans open?",
    a: "With the Marketplace listing. Until then, join the launch list from any Join the launch list button.",
  },
  {
    q: "How does billing work?",
    a: "Monthly through Stripe Checkout. Update or cancel from the link in your receipt.",
  },
  {
    q: "Does Free include backfill?",
    a: "Yes. Full history on one source.",
  },
  {
    q: "How does this compare to Polar’s dashboard?",
    a: (
      <>
        Polar’s Analytics covers Polar. RevenueSheet combines Polar with Lemon Squeezy, Gumroad, and
        Stripe in a sheet you own. See{" "}
        <Link href="/vs/polar-dashboard">RevenueSheet vs Polar’s dashboard</Link>.
      </>
    ),
  },
  {
    q: "What about refunds?",
    a: REFUND_LINE,
  },
];

export default function PricingPage() {
  return (
    <main className="pricing-page page-shell">
      <Pricing variant="page" />

      <section className="section pricing-extras">
        <div className="container">
          <h2 className="h2">What every plan includes</h2>
          <ul className="hairline-list">
            {includes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <h2 className="h2 pricing-extras-h2">Plan comparison</h2>
          <div className="compare-wrap">
            <table className="pricing-table">
              <thead>
                <tr>
                  <th scope="col">Capability</th>
                  <th scope="col">Free</th>
                  <th scope="col">Pro</th>
                  <th scope="col">Business</th>
                </tr>
              </thead>
              <tbody>
                {compareRows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    <td>{row.free}</td>
                    <td>{row.pro}</td>
                    <td>{row.business}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="compare-more muted">
            Already on Polar?{" "}
            <Link href="/vs/polar-dashboard">See RevenueSheet vs Polar’s dashboard →</Link>
          </p>

          <h2 className="h2 pricing-extras-h2">Billing FAQ</h2>
          <div className="faq-list">
            {faq.map((item) => (
              <details key={item.q} className="faq-item">
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>

          <div className="final-cta pricing-launch-cta">
            <h2 className="h2 final-cta-title">
              Be first in when the
              <br />
              listing goes live.
            </h2>
            <LaunchInvite id="launch" source="pricing-page" />
          </div>
        </div>
      </section>
    </main>
  );
}
