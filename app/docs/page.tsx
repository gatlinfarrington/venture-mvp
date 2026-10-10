import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/lib/brand";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Docs",
  description: `Help center for ${brand.name}: connect Lemon Squeezy, Polar, or Gumroad, manage API keys, FAQ, and troubleshooting.`,
  alternates: { canonical: `${siteConfig.url}/docs` },
  openGraph: {
    title: `Docs · ${brand.name}`,
    description: `Setup guides, API keys, FAQ, and troubleshooting for ${brand.name}.`,
    url: `${siteConfig.url}/docs`,
  },
};

const cards = [
  {
    href: "/docs/setup/lemon-squeezy",
    title: "Lemon Squeezy setup",
    body: "API key, store scope, first backfill, and dashboard tiles.",
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
    href: "/docs/api-keys",
    title: "API keys",
    body: "Where keys are stored, how to rotate them, and what never leaves your sheet.",
  },
  {
    href: "/docs/faq",
    title: "FAQ",
    body: "Data storage, Google scopes, billing, and Lemon Squeezy → Stripe notes.",
  },
  {
    href: "/docs/troubleshooting",
    title: "Troubleshooting",
    body: "Empty tabs, auth errors, rate limits, and license verification.",
  },
  {
    href: "/docs/go-live",
    title: "Stripe go-live",
    body: "Owner checklist: paste keys, webhook events, lookup_keys, admin status.",
  },
] as const;

export default function DocsIndexPage() {
  return (
    <main className="docs-page">
      <p className="eyebrow">Help center</p>
      <h1>Docs</h1>
      <p className="body-lg muted" style={{ maxWidth: "62ch" }}>
        Setup for each source, API key handling, FAQ, and fixes when sync stalls. Install the add-on
        from the Workspace Marketplace, then return here when a step is unclear.
      </p>
      <ul className="docs-card-list">
        {cards.map((card) => (
          <li key={card.href}>
            <Link href={card.href}>
              <span className="docs-card-title">{card.title}</span>
              <span className="muted">{card.body}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="muted" style={{ marginTop: "var(--space-8)" }}>
        Still stuck? Email{" "}
        <a href={`mailto:${brand.legal.supportEmail}`}>{brand.legal.supportEmail}</a>.
      </p>
    </main>
  );
}
