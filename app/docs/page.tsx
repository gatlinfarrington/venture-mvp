import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { brand } from "@/lib/brand";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Docs",
  description: `Help center for ${brand.name}: connect Lemon Squeezy, Polar, Gumroad, or Stripe, manage API keys, FAQ, and troubleshooting.`,
  alternates: { canonical: `${siteConfig.url}/docs` },
  openGraph: {
    title: `Docs · ${brand.name}`,
    description: `Setup guides, API keys, FAQ, and troubleshooting for ${brand.name}.`,
    url: `${siteConfig.url}/docs`,
  },
};

const quickstart = [
  {
    n: "01",
    title: "Install",
    body: "Add RevenueSheet from the Workspace Marketplace (or join the launch list until listing day).",
    href: "/#launch",
  },
  {
    n: "02",
    title: "Connect a store with an API key",
    body: "Paste a Lemon Squeezy, Polar, Gumroad, or Stripe key in the sidebar.",
    href: "/docs/api-keys",
  },
  {
    n: "03",
    title: "Run backfill",
    body: "Pull full history into Orders, Subscriptions, Customers, and Refunds.",
    href: "/docs/setup/lemon-squeezy",
  },
] as const;

const setup = [
  {
    href: "/docs/setup/lemon-squeezy",
    title: "Lemon Squeezy setup",
    body: "API key, first backfill, and dashboard tiles.",
  },
  {
    href: "/docs/setup/polar",
    title: "Polar setup",
    body: "Organization token, order and subscription scopes, scheduled refresh.",
  },
  {
    href: "/docs/setup/gumroad",
    title: "Gumroad setup",
    body: "Access token, sales history, refunds, and combining with other sources.",
  },
  {
    href: "/docs/setup/stripe",
    title: "Stripe setup",
    body: "Restricted key, read-only scopes, charges and subscriptions backfill.",
  },
  {
    href: "/docs/csv-import",
    title: "CSV import",
    body: "Bring orders from any other store when there is no API connector.",
  },
  {
    href: "/docs/api-keys",
    title: "API keys",
    body: "Where keys are stored, how to rotate them, and what never leaves your sheet.",
  },
  {
    href: "/docs/mrr-and-churn",
    title: "How we calculate MRR and churn",
    body: "Interval normalization, monthly conversion, and logo churn windows from the add-on code.",
  },
] as const;

const help = [
  {
    href: "/docs/faq",
    title: "FAQ",
    body: "Data storage, Google scopes, billing, and Lemon Squeezy to Stripe notes.",
  },
  {
    href: "/docs/troubleshooting",
    title: "Troubleshooting",
    body: "Empty tabs, auth errors, rate limits, and license verification.",
  },
] as const;

export default function DocsIndexPage() {
  return (
    <main className="docs-page">
      <p className="eyebrow">Help center</p>
      <h1>Docs</h1>
      <p className="body-lg muted docs-lede">
        Setup for each source, API key handling, FAQ, and fixes when sync stalls.
      </p>

      <div className="docs-top">
        <section className="docs-start">
          <h2 className="h3">Start here</h2>
          <ol className="docs-quickstart">
            {quickstart.map((step) => (
              <li key={step.n}>
                <Link href={step.href}>
                  <span className="docs-quickstart-n mono">{step.n}</span>
                  <span className="docs-card-title">{step.title}</span>
                  <span className="muted">{step.body}</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <div className="docs-mrr-card">
            <h2 className="docs-card-title">How we calculate MRR</h2>
            <p>Yearly plans count as amount ÷ 12. Only active subscriptions count by default.</p>
            <Link href="/docs/mrr-and-churn">Read the method →</Link>
          </div>
          <h2 className="docs-group-label mono">Setup</h2>
          <ul className="docs-card-list">
            {setup.map((card, i) => (
              <Reveal as="li" key={card.href} className="reveal-rise" delay={i * 80}>
                <Link href={card.href}>
                  <span className="docs-card-title">{card.title}</span>
                  <span className="muted">{card.body}</span>
                </Link>
              </Reveal>
            ))}
          </ul>
        </section>
      </div>

      <div className="docs-groups">
        <section>
          <h2 className="docs-group-label mono">Help</h2>
          <ul className="docs-card-list">
            {help.map((card, i) => (
              <Reveal as="li" key={card.href} className="reveal-rise" delay={i * 80}>
                <Link href={card.href}>
                  <span className="docs-card-title">{card.title}</span>
                  <span className="muted">{card.body}</span>
                </Link>
              </Reveal>
            ))}
          </ul>
        </section>
      </div>

      <p className="docs-support-row">
        Can&apos;t find it? See <Link href="/support">Support</Link>.
      </p>
    </main>
  );
}
