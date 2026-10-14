import type { Metadata } from "next";
import Link from "next/link";
import { InstallCta } from "@/components/InstallCta";
import { SupportForm } from "@/components/SupportForm";
import { brand } from "@/lib/brand";
import { REFUND_LINE } from "@/lib/copy";
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

const selfServe = [
  {
    href: "/docs",
    label: "Docs",
    line: "Setup for Lemon Squeezy, Polar, Gumroad, and Stripe",
  },
  {
    href: "/docs/faq",
    label: "FAQ",
    line: "Data storage, scopes, billing",
  },
  {
    href: "/docs/troubleshooting",
    label: "Troubleshooting",
    line: "Empty tabs, auth, rate limits, license verify",
  },
  {
    href: "/docs/api-keys",
    label: "API keys",
    line: "Where keys live and how to rotate them",
  },
  {
    href: "/security",
    label: "Security",
    line: "Scopes, what reaches our servers, subprocessors",
  },
] as const;

export default function SupportPage() {
  return (
    <main className="legal container page-shell">
      <p className="eyebrow">Help</p>
      <h1>Support</h1>
      <p className="body-lg muted page-lede">
        Start with the docs. Most sync and license questions are answered there, without waiting on
        an inbox. Still stuck? Send a message below.
      </p>

      <div className="prose">
        <h2>Self-serve</h2>
        <ul className="support-link-rows">
          {selfServe.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="support-link-row">
                <span className="support-link-label">{item.label}</span>
                <span className="support-link-line muted">{item.line}</span>
              </Link>
            </li>
          ))}
        </ul>

        <h2>Billing and licenses</h2>
        <p>
          Once paid plans open, they run through Stripe Checkout. Use the customer portal link on
          your receipt to update payment methods or cancel. Once paid plans open, after purchase the
          success page shows your license key: paste it in the add-on sidebar.
        </p>
        <p>{REFUND_LINE}</p>

        <h2>Contact us</h2>
        <p>
          Billing, license keys, sync errors, or setup questions: we reply to the email you provide.
        </p>
      </div>

      <div className="support-form-wrap">
        <SupportForm />
      </div>

      <div className="prose" style={{ marginTop: "var(--space-10)" }}>
        <h2>Launch</h2>
        <p>
          <InstallCta className="btn btn-primary" source="support">
            Join the launch list
          </InstallCta>
        </p>
      </div>
    </main>
  );
}
