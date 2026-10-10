import { HeroDemoLazy } from "@/components/HeroDemoLazy";
import { InstallCta } from "@/components/InstallCta";
import { Pricing } from "@/components/Pricing";
import { ResponsiveCrop } from "@/components/ResponsiveCrop";
import { Reveal } from "@/components/Reveal";
import { brand } from "@/lib/brand";
import { REFUND_LINE } from "@/lib/copy";
import { siteConfig } from "@/lib/site";

export function Hero() {
  return (
    <section className="hero">
      <div className="container hero-grid">
        <div className="hero-copy">
          <p className="eyebrow hero-reveal" style={{ animationDelay: "0ms" }}>
            {brand.taglineShort}
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
          <div className="hero-pills hero-reveal" style={{ animationDelay: "180ms" }}>
            {siteConfig.sources.map((s) => (
              <span key={s} className="pill">
                {s}
              </span>
            ))}
          </div>
          <div className="hero-ctas hero-reveal" style={{ animationDelay: "240ms" }}>
            <InstallCta className="btn btn-primary" source="hero">
              Install for Google Sheets
            </InstallCta>
            <a className="btn btn-secondary" href="#dashboard">
              See the dashboard
            </a>
          </div>
        </div>
        <div className="hero-frame hero-reveal" style={{ animationDelay: "300ms" }}>
          <HeroDemoLazy />
        </div>
      </div>
    </section>
  );
}

export function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Connect",
      body: "Paste an API key from Lemon Squeezy, Polar, Gumroad, or Stripe. No OAuth dance with those stores: the add-on reads what you grant.",
      desktop: "/design/how-connect-2x.png",
      phone: "/design/how-connect-phone-2x.png",
      alt: "Connect sources panel with example store connections",
    },
    {
      n: "02",
      title: "Backfill",
      body: "We pull full order history into named tabs, not just new rows from today. Then scheduled sync keeps the sheet current.",
      desktop: "/design/how-backfill-2x.png",
      phone: "/design/how-backfill-phone-2x.png",
      alt: "Sidebar mid-backfill with ink progress bar and orders writing in",
    },
    {
      n: "03",
      title: "Dashboard",
      body: "MRR, churn, and revenue by product land on a Dashboard tab built from your data (formulas you can audit and extend).",
      desktop: "/design/how-dashboard-2x.png",
      phone: "/design/how-dashboard-phone-2x.png",
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
              <div className="step-frame">
                <ResponsiveCrop
                  desktop={step.desktop}
                  phone={step.phone}
                  alt={step.alt}
                  width={2400}
                  height={1800}
                  sizes="(max-width: 900px) 100vw, 33vw"
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
              alt="Orders tab with Order ID, created, source, product, email, amount, and status"
              width={2400}
              height={1800}
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
  const cols = [
    {
      title: "You own the data",
      body: "Rows live in your Google account. Export, share, or delete without asking a vendor dashboard for a CSV.",
    },
    {
      title: "Use your own formulas",
      body: "Named ranges like rs_orders and rs_mrr_monthly are ready for QUERY, FILTER, and the models you already trust.",
    },
    {
      title: "No new dashboard to learn",
      body: "If you already live in Sheets for taxes, investor updates, or cohort math, keep that habit. We fill the cells.",
    },
  ];

  return (
    <section className="section">
      <div className="container">
        <Reveal className="section-head">
          <p className="eyebrow">Why a sheet</p>
          <h2 className="h2">A spreadsheet you control beats another login.</h2>
        </Reveal>
        <div className="why-grid">
          {cols.map((c, i) => (
            <Reveal key={c.title} className="why-col" delay={Math.min(i, 4) * 60}>
              <h3 className="h3">{c.title}</h3>
              <p className="muted">{c.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Comparison() {
  const rows = [
    { feature: "Full history backfill", rs: true, zapier: false, csv: false },
    { feature: "MRR dashboard tab", rs: true, zapier: false, csv: "Manual" },
    { feature: "Multi-store (Business)", rs: true, zapier: "Extra Zaps", csv: false },
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
            Zapier, Make, and API Connector can stream events. They do not backfill years of history or build an MRR tab.
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
      q: "Lemon Squeezy is moving to Stripe. Will this still work?",
      a: "Yes for as long as Lemon Squeezy exposes an orders API, and you can also connect Stripe directly. Polar and Gumroad stay independent sources either way.",
    },
    {
      q: "How do refunds work for paid plans?",
      a: REFUND_LINE,
    },
    {
      q: "How do I cancel?",
      a: "When paid plans are live, open the Stripe customer portal from your receipt email. After cancel, the license becomes inactive on the next webhook; Free-tier limits still apply if you keep the add-on installed.",
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
  return (
    <section className="section">
      <div className="container">
        <Reveal className="final-cta">
          <h2 className="h2">
            Your revenue,
            <br />
            finally in one place.
          </h2>
          <InstallCta className="btn btn-primary" source="final-cta">
            Install for Google Sheets
          </InstallCta>
        </Reveal>
      </div>
    </section>
  );
}

export { Pricing };
