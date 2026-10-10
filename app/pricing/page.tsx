import type { Metadata } from "next";
import { LaunchInvite } from "@/components/LaunchInvite";
import { Pricing } from "@/components/Pricing";
import { brand } from "@/lib/brand";
import { REFUND_LINE } from "@/lib/copy";
import { pricing, siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Pricing",
  description: `Free, Pro, and Business plans for ${brand.name}. Manual refresh free; scheduled sync from $9/mo.`,
  alternates: { canonical: `${siteConfig.url}/pricing` },
  openGraph: {
    title: `Pricing · ${brand.name}`,
    description: `Free, Pro, and Business plans for ${brand.name}.`,
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
    pro: "All three",
    business: "All three",
  },
  {
    label: "Refresh",
    free: pricing.free.refresh,
    pro: "Scheduled",
    business: "Scheduled",
  },
  {
    label: "Stores per source",
    free: String(pricing.free.stores),
    pro: "1",
    business: "Multiple",
  },
  {
    label: "Priority sync queue",
    free: "No",
    pro: "No",
    business: "Yes",
  },
  {
    label: "Email support",
    free: "No",
    pro: "No",
    business: "Yes",
  },
];

const faq = [
  {
    q: "When do paid plans open?",
    a: "With the Marketplace listing. Until then, join the launch list from any Join the launch list button.",
  },
  {
    q: "How does billing work?",
    a: "Stripe Checkout; manage or cancel in the Stripe customer portal.",
  },
  {
    q: "What about refunds?",
    a: REFUND_LINE,
  },
  {
    q: "Are prices final?",
    a: "No. They're estimates until launch.",
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
                  <th scope="col"> </th>
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
