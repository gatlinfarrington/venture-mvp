import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/lib/brand";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "FAQ",
  description: `Frequently asked questions about ${brand.name}: data storage, Google scopes, billing, and platform changes.`,
  alternates: { canonical: `${siteConfig.url}/docs/faq` },
};

const faqs = [
  {
    q: "Where does my revenue data live?",
    a: `Order and subscription rows are written into Google Sheets in your Google account. ${brand.name} does not keep a separate full copy of your ledger on our servers. License and billing records for paid plans are stored so we can verify your tier.`,
  },
  {
    q: "Which Google scopes does the add-on use?",
    a: "Scopes are limited to the spreadsheet the add-on is installed on (and related Drive file access required by Apps Script). We do not request Gmail, Contacts, or broad Drive access. See the Privacy policy for Google user data and Limited Use.",
  },
  {
    q: "Can I use more than one storefront?",
    a: "Free allows one source. Pro unlocks Lemon Squeezy, Polar, and Gumroad together with scheduled refresh. Business adds multiple stores per source.",
  },
  {
    q: "What if Lemon Squeezy moves features toward Stripe?",
    a: "Keep history in Sheets so platform changes do not erase your analytics trail. See the Stripe comparison page for how a sheet-native workflow fits beside Stripe-powered rails.",
  },
  {
    q: "How do refunds and cancellations work for my license?",
    a: `First-time charges may be refunded within 14 days via ${brand.legal.supportEmail}. Cancel anytime in Stripe Customer Portal when configured; access continues through the paid period unless a refund is issued.`,
  },
  {
    q: "Is the marketing dashboard real customer data?",
    a: "No. The landing demo uses labeled example rows. Your installed sheet starts without customer PII until you connect a store.",
  },
] as const;

export default function DocsFaqPage() {
  return (
    <main className="docs-page">
      <p className="eyebrow">Help</p>
      <h1>FAQ</h1>
      <div className="prose">
        {faqs.map((item) => (
          <section key={item.q}>
            <h2>{item.q}</h2>
            <p>{item.a}</p>
          </section>
        ))}
        <p>
          Legal detail: <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link> ·{" "}
          <Link href="/pricing">Pricing</Link>
        </p>
      </div>
    </main>
  );
}
