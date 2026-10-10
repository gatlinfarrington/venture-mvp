import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/lib/brand";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Support",
  description: `Get help with ${brand.name}: docs, FAQ, troubleshooting, billing, and security.`,
  alternates: { canonical: `${siteConfig.url}/support` },
  openGraph: {
    title: `Support · ${brand.name}`,
    description: `Help center links for ${brand.name} setup, sync, and licenses.`,
    url: `${siteConfig.url}/support`,
  },
};

export default function SupportPage() {
  return (
    <main className="legal container page-shell">
      <p className="eyebrow">Help</p>
      <h1>Support</h1>
      <p className="body-lg muted page-lede">
        Start with the docs. Most sync and license questions are answered there — without waiting on
        an inbox.
      </p>

      <div className="prose">
        <h2>Self-serve</h2>
        <ul>
          <li>
            <Link href="/docs">Docs</Link> — setup for Lemon Squeezy, Polar, and Gumroad
          </li>
          <li>
            <Link href="/docs/faq">FAQ</Link> — data storage, scopes, billing
          </li>
          <li>
            <Link href="/docs/troubleshooting">Troubleshooting</Link> — empty tabs, auth, rate
            limits, license verify
          </li>
          <li>
            <Link href="/docs/api-keys">API keys</Link> — where keys live and how to rotate them
          </li>
          <li>
            <Link href="/security">Security</Link> — scopes, what reaches our servers, subprocessors
          </li>
        </ul>

        <h2>Billing and licenses</h2>
        <p>
          Paid plans run through Stripe Checkout. Use the customer portal link on your receipt to
          update payment methods or cancel. After purchase, the success page shows your license key —
          paste it in the add-on sidebar.
        </p>
        <p>
          First-time charges may be refunded within 14 days. Open a request from the contact channel
          on your Stripe receipt and include the checkout session id.
        </p>

        <h2>Install</h2>
        <p>
          <a className="btn btn-primary" href={siteConfig.installUrl}>
            Install for Google Sheets
          </a>
        </p>
      </div>
    </main>
  );
}
