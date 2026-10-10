import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/lib/brand";
import { PRICE_LOOKUP_KEYS } from "@/lib/stripe-catalog";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Stripe go-live",
  description: `Owner checklist to enable ${brand.name} paid Checkout with Stripe keys only.`,
  alternates: { canonical: `${siteConfig.url}/docs/go-live` },
};

export default function GoLiveDocsPage() {
  return (
    <main className="docs-page">
      <p className="eyebrow">Owner</p>
      <h1>Stripe go-live</h1>
      <div className="prose">
        <p>
          Full checklist lives in the repo at <code className="mono">docs/GO-LIVE.md</code>. Summary:
          paste Stripe keys into Vercel, point a webhook at{" "}
          <code className="mono">/api/webhooks/stripe</code>, and paid buttons turn on.
        </p>
        <h2>Minimum env</h2>
        <ul>
          <li>
            <code className="mono">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> — enables Checkout CTAs
          </li>
          <li>
            <code className="mono">STRIPE_SECRET_KEY</code> — creates sessions / prices
          </li>
          <li>
            <code className="mono">STRIPE_WEBHOOK_SECRET</code> — issues licenses
          </li>
          <li>
            <code className="mono">UPSTASH_REDIS_*</code> — durable license storage on Vercel
          </li>
        </ul>
        <h2>Webhook events</h2>
        <ul>
          <li>
            <code className="mono">checkout.session.completed</code>
          </li>
          <li>
            <code className="mono">customer.subscription.updated</code>
          </li>
          <li>
            <code className="mono">customer.subscription.deleted</code>
          </li>
        </ul>
        <h2>Price lookup_keys</h2>
        <ul>
          <li>
            <code className="mono">{PRICE_LOOKUP_KEYS.pro.month}</code>
          </li>
          <li>
            <code className="mono">{PRICE_LOOKUP_KEYS.pro.year}</code>
          </li>
          <li>
            <code className="mono">{PRICE_LOOKUP_KEYS.business.month}</code>
          </li>
          <li>
            <code className="mono">{PRICE_LOOKUP_KEYS.business.year}</code>
          </li>
        </ul>
        <p>
          Optional sync: <code className="mono">npm run stripe:sync-prices</code>. Admin JSON:{" "}
          <code className="mono">GET /api/admin/stripe-status</code> with Bearer{" "}
          <code className="mono">STRIPE_ADMIN_TOKEN</code>.
        </p>
        <p>
          <Link href="/docs">Back to docs</Link> · <Link href="/pricing">Pricing</Link>
        </p>
      </div>
    </main>
  );
}
