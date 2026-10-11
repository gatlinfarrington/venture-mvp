import { HeroDemoLazy } from "@/components/HeroDemoLazy";
import { InstallCta } from "@/components/InstallCta";
import { LaunchInvite } from "@/components/LaunchInvite";
import { Pricing } from "@/components/Pricing";
import { ResponsiveCrop } from "@/components/ResponsiveCrop";
import { Reveal } from "@/components/Reveal";
import { SampleSheetLink } from "@/components/SampleSheetLink";
import { brand, marketplaceUrl } from "@/lib/brand";
import { REFUND_LINE } from "@/lib/copy";
import Link from "next/link";

export function Hero() {
  const listing = marketplaceUrl();

  return (
    <section className="hero">
      <div className="container hero-grid">
        <div className="hero-copy">
          <p className="eyebrow hero-reveal" style={{ animationDelay: "0ms" }}>
            Google Sheets add-on
          </p>
          <h1 className="display hero-reveal" style={{ animationDelay: "60ms" }}>
            All your stores,
            <br />
            in a sheet{" "}
            <br className="br-phone" />
            you&nbsp;own.
          </h1>
          <p className="body-lg muted hero-lede hero-reveal" style={{ animationDelay: "120ms" }}>
            {brand.description}
          </p>
          <div className="hero-ctas hero-reveal" style={{ animationDelay: "180ms" }}>
            {listing ? (
              <>
                <InstallCta className="btn btn-primary" source="hero">
                  Install for Google Sheets
                </InstallCta>
                <a className="btn btn-secondary" href="#dashboard">
                  See the dashboard
                </a>
                <SampleSheetLink className="btn btn-secondary" source="hero-sample" />
              </>
            ) : (
              <>
                <LaunchInvite id="launch" source="hero" />
                <SampleSheetLink className="btn btn-secondary" source="hero-sample" />
              </>
            )}
          </div>
          {!listing ? (
            <dl className="hero-facts hero-reveal" style={{ animationDelay: "240ms" }}>
              <div>
                <dt>Status</dt>
                <dd>Built and in testing. Not yet on the Marketplace.</dd>
              </div>
              <div>
                <dt>Sources</dt>
                <dd>Lemon Squeezy, Polar, Gumroad and Stripe, plus CSV</dd>
              </div>
              <div>
                <dt>Free plan</dt>
                <dd>1 source, manual refresh</dd>
              </div>
            </dl>
          ) : null}
        </div>
        <div className="hero-frame hero-reveal" style={{ animationDelay: "300ms" }}>
          <HeroDemoLazy />
        </div>
      </div>
    </section>
  );
}

export function HowItWorks() {
  const steps: Array<{
    n: string;
    title: string;
    body: string;
    keysNote?: boolean;
    src: string;
    w: number;
    h: number;
    alt: string;
  }> = [
    {
      n: "01",
      title: "Connect",
      body: "Paste an API key from Lemon Squeezy, Polar, Gumroad, or Stripe, or import CSV for anything else. No OAuth dance with those stores: the add-on reads what you grant.",
      keysNote: true,
      src: "/design/how-connect-2x.png",
      w: 600,
      h: 600,
      alt: "Connect sources panel with example store connections",
    },
    {
      n: "02",
      title: "Backfill",
      body: "We pull full order history into named tabs, not just new rows from today. Then scheduled sync keeps the sheet current.",
      src: "/design/how-backfill-2x.png",
      w: 600,
      h: 600,
      alt: "Sidebar mid-backfill with ink progress bar and orders writing in",
    },
    {
      n: "03",
      title: "Dashboard",
      body: "MRR, churn, and revenue by product land on a Dashboard tab built from your data (formulas you can audit and extend).",
      src: "/design/how-dashboard-2x.png",
      w: 600,
      h: 600,
      alt: "MRR dashboard with KPIs and stacked source chart",
    },
  ];

  return (
    <section id="how-it-works" className="section">
      <div className="container">
        <Reveal className="section-head">
          <p className="eyebrow">How it works</p>
          <h2 className="h2">Connect once. Backfill history. Keep the sheet fresh.</h2>
        </Reveal>
        <div className="steps">
          {steps.map((step, i) => (
            <Reveal key={step.n} className="step" delay={Math.min(i, 4) * 60}>
              <span className="step-num">{step.n}</span>
              <h3 className="h3">{step.title}</h3>
              <p className="muted">{step.body}</p>
              {step.keysNote ? (
                <p className="step-keys-note mono muted">
                  Keys stay in your Google account. We never receive them. Rotate anytime.{" "}
                  <Link href="/security">How it works →</Link>
                </p>
              ) : null}
              <div className="step-frame">
                <ResponsiveCrop
                  desktop={step.src}
                  alt={step.alt}
                  width={step.w}
                  height={step.h}
                  sizes="(max-width: 900px) 100vw, 300px"
                  quality={75}
                />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function WhatLands() {
  const tabs = [
    { name: "Orders", desc: "Order ID, created, source, product, email, amount, status." },
    { name: "Subscriptions", desc: "Active and canceled subs with renewals and MRR contribution." },
    { name: "Customers", desc: "Buyer email, first seen, and last purchase from each connected source." },
    { name: "Refunds", desc: "Refunds and chargebacks linked back to the original order." },
    { name: "Dashboard", desc: "MRR, net revenue, churn, and revenue by product (auto-built)." },
  ];

  return (
    <section id="dashboard" className="section">
      <div className="container">
        <Reveal className="section-head">
          <p className="eyebrow">What lands in your sheet</p>
          <h2 className="h2">Named tabs you can sort, filter, and formula against.</h2>
        </Reveal>
        <div className="lands">
          <Reveal className="lands-tabs">
            <ul className="tab-list">
              {tabs.map((t) => (
                <li key={t.name}>
                  <span className="tab-name">{t.name}</span>
                  <span className="muted">{t.desc}</span>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal className="lands-frame" delay={60}>
            <ResponsiveCrop
              desktop="/design/lands-orders-2x.png"
              phone="/design/lands-orders-phone-2x.png"
              alt="Orders tab with Order ID, Created, Source, Product, and Amount"
              width={1200}
              height={685}
              phoneWidth={590}
              phoneHeight={600}
              sizes="(max-width: 900px) 100vw, 55vw"
              quality={70}
            />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export function WhySheet() {
  const claims = [
    "You own the data in your Google account.",
    "Named ranges ready for QUERY and FILTER.",
    "No new dashboard to learn.",
  ];

  return (
    <section className="section">
      <div className="container">
        <Reveal className="section-head">
          <p className="eyebrow">Why a sheet</p>
          <h2 className="h2">A spreadsheet you control beats another login.</h2>
        </Reveal>
        <Reveal className="why-artifact">
          <pre className="why-formula" tabIndex={0}>
            <code>
              {`=QUERY(rs_orders, "select C, sum(F) where G = 'paid' group by C label sum(F) 'Revenue'")`}
            </code>
          </pre>
          <table className="why-result">
            <thead>
              <tr>
                <th>Product</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Lifetime deal</td>
                <td className="num">$4,280</td>
              </tr>
              <tr>
                <td>Pro annual</td>
                <td className="num">$2,160</td>
              </tr>
              <tr>
                <td>Starter monthly</td>
                <td className="num">$890</td>
              </tr>
            </tbody>
          </table>
          <ul className="why-claims">
            {claims.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

export function Comparison() {
  const rows = [
    { feature: "Full history backfill", rs: true, zapier: false, csv: false },
    { feature: "MRR dashboard tab", rs: true, zapier: false, csv: "Manual" },
    { feature: "Multi-source (Pro+)", rs: true, zapier: "Extra Zaps", csv: false },
    { feature: "Scheduled refresh", rs: true, zapier: true, csv: false },
    { feature: "Data stays in your Sheet", rs: true, zapier: true, csv: true },
  ];

  return (
    <section className="section section-compare">
      <div className="container">
        <Reveal className="section-head">
          <p className="eyebrow">Compare</p>
          <h2 className="h2">Append-only tools stop at new rows.</h2>
          <p className="muted body-lg">
            Zapier, Make, and API Connector can stream events. They have no built-in history
            backfill or MRR tab.
          </p>
        </Reveal>
        <Reveal className="compare-wrap">
          <table className="compare-table">
            <thead>
              <tr>
                <th>Capability</th>
                <th>{brand.name}</th>
                <th>Zapier / Make append</th>
                <th>CSV templates</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.feature}>
                  <td>{r.feature}</td>
                  <td data-label={brand.name} className={r.rs === true ? "yes" : "no"}>
                    {r.rs === true ? "Yes" : String(r.rs)}
                  </td>
                  <td
                    data-label="Zapier / Make"
                    className={r.zapier === true ? "yes-ink" : "no"}
                  >
                    {r.zapier === true ? "Yes" : r.zapier === false ? "No" : r.zapier}
                  </td>
                  <td
                    data-label="CSV templates"
                    className={r.csv === true ? "yes-ink" : "no"}
                  >
                    {r.csv === true ? "Yes" : r.csv === false ? "No" : r.csv}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Reveal>
        <p className="compare-more muted">
          Selling on Polar too?{" "}
          <Link href="/vs/polar-dashboard">RevenueSheet vs Polar’s dashboard →</Link>
        </p>
      </div>
    </section>
  );
}

export function FAQ() {
  const items = [
    {
      q: "Where does my data live?",
      a: `Order and subscription rows land in your Google Sheet. License keys, support messages, and launch invites are stored so we can run the product: on Vercel (hosting), Upstash Redis (licenses and form storage), and Stripe (billing). Details are on the privacy page.`,
    },
    {
      q: "What Google scopes do you need?",
      a: "Only four Apps Script scopes: the current spreadsheet (spreadsheets.currentonly), outbound HTTPS to source and license APIs (script.external_request), time-driven triggers for scheduled refresh (script.scriptapp), and the sidebar/menu UI (script.container.ui). No Google Drive, Gmail, or Contacts access. Confirm on the consent screen at install.",
    },
    {
      q: "How do refunds work for paid plans?",
      a: REFUND_LINE,
    },
    {
      q: "How do I cancel?",
      a: "Open the Stripe customer portal from your receipt email. Your license stays active through the period you already paid for. When that period ends, paid features turn off and Free limits apply if you keep the add-on installed. Your sheet data stays.",
    },
  ];

  return (
    <section id="faq" className="section">
      <div className="container">
        <Reveal className="section-head">
          <p className="eyebrow">FAQ</p>
          <h2 className="h2">Data, scopes, billing.</h2>
        </Reveal>
        <Reveal className="faq-list">
          {items.map((item) => (
            <details key={item.q} className="faq-item">
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

export function FinalCTA() {
  const listing = marketplaceUrl();

  return (
    <section className="section">
      <div className="container">
        <Reveal className="final-cta">
          {listing ? (
            <>
              <h2 className="h2">
                Your revenue,
                <br />
                finally in one place.
              </h2>
              <InstallCta className="btn btn-primary" source="final-cta">
                Install for Google Sheets
              </InstallCta>
            </>
          ) : (
            <>
              <h2 className="h2 final-cta-title">
                Be first in when the
                <br />
                listing goes live.
              </h2>
              <LaunchInvite source="final-cta" />
            </>
          )}
        </Reveal>
      </div>
    </section>
  );
}

export { Pricing };
