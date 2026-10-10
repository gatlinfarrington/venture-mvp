import Image from "next/image";
import { HeroDemoLazy } from "@/components/HeroDemoLazy";
import { Pricing } from "@/components/Pricing";
import { Reveal } from "@/components/Reveal";
import { brand } from "@/lib/brand";
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
            All your stores,<br className="br-lg" /> in a sheet you own.
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
            <a className="btn btn-primary" href={siteConfig.installUrl}>
              Install for Google Sheets
            </a>
            <a className="btn btn-secondary" href="#dashboard">
              See the dashboard
            </a>
          </div>
          <p className="eyebrow hero-reveal" style={{ animationDelay: "300ms", marginTop: "var(--space-2)" }}>
            Demo shows example data
          </p>
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
      body: "Paste an API key from Lemon Squeezy, Polar, or Gumroad. No OAuth dance with those stores — the add-on reads what you grant.",
      img: "/design/screenshot-2-connect.png",
      alt: "Connect sources panel with example store connections",
    },
    {
      n: "02",
      title: "Backfill",
      body: "We pull full order history into named tabs, not just new rows from today. Then scheduled sync keeps the sheet current.",
      img: "/design/screenshot-3-products.png",
      alt: "Orders tab filling with product and amount columns",
    },
    {
      n: "03",
      title: "Dashboard",
      body: "MRR, churn, and revenue by product land on a Dashboard tab built from your data — formulas you can audit and extend.",
      img: "/design/screenshot-1-dashboard.png",
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
                <Image
                  src={step.img}
                  alt={step.alt}
                  width={640}
                  height={400}
                  sizes="(max-width: 900px) 100vw, 33vw"
                  quality={70}
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
    { name: "Customers", desc: "Deduped buyers across stores with first and last purchase." },
    { name: "Refunds", desc: "Refunds and chargebacks linked back to the original order." },
    { name: "Dashboard", desc: "MRR, net revenue, churn, and revenue by product — auto-built." },
  ];

  return (
    <section id="dashboard" className="section">
      <div className="container">
        <Reveal className="section-head">
          <p className="eyebrow">What lands in your sheet</p>
          <h2 className="h2">Named tabs you can sort, filter, and formula against.</h2>
        </Reveal>
        <div className="lands">
          <Reveal>
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
            <Image
              src="/design/screenshot-3-products.png"
              alt="Orders tab with example product rows and amounts"
              width={960}
              height={640}
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
      body: "If you already live in Sheets for taxes, investor updates, or cohort math, keep that habit — we fill the cells.",
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
    <section className="section">
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
                  <td className={r.rs === true ? "yes" : "no"}>
                    {r.rs === true ? "Yes" : String(r.rs)}
                  </td>
                  <td className={r.zapier === true ? "yes" : "no"}>
                    {r.zapier === true ? "Yes" : r.zapier === false ? "No" : r.zapier}
                  </td>
                  <td className={r.csv === true ? "yes" : "no"}>
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
      a: `Synced rows are written into your Google Sheet. ${brand.name} also stores license and sync settings needed to run the add-on. Exact retention and subprocessors will be listed in the privacy policy before paid launch.`,
    },
    {
      q: "What Google scopes do you need?",
      a: "Only four Apps Script scopes: the current spreadsheet (spreadsheets.currentonly), outbound HTTPS to source and license APIs (script.external_request), time-driven triggers for scheduled refresh (script.scriptapp), and the sidebar/menu UI (script.container.ui). No Google Drive, Gmail, or Contacts access. Confirm on the consent screen at install.",
    },
    {
      q: "Lemon Squeezy is moving to Stripe — will this still work?",
      a: "Yes for as long as Lemon Squeezy (or its successor) exposes an orders/subscriptions API. If the API changes, we update the importer. Polar and Gumroad remain independent sources.",
    },
    {
      q: "How do refunds work for paid plans?",
      a: "Billing runs through Stripe. Refund and cancel terms will be published with paid launch; until then, email support and we will handle requests case by case. Cancel anytime from the Stripe customer portal in your receipt.",
    },
    {
      q: "How do I cancel?",
      a: "Use the Stripe customer portal link in your receipt email. After cancel, the license becomes inactive on the next webhook; Free-tier limits still apply if you keep the add-on installed.",
    },
  ];

  return (
    <section id="faq" className="section">
      <div className="container">
        <Reveal className="section-head">
          <p className="eyebrow">FAQ</p>
          <h2 className="h2">Straight answers before you install.</h2>
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
          <h2 className="h2">Your revenue, finally in one place.</h2>
          <a className="btn btn-primary" href={siteConfig.installUrl}>
            Install for Google Sheets
          </a>
        </Reveal>
      </div>
    </section>
  );
}

export { Pricing };
