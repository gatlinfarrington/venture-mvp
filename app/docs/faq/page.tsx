import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { brand } from "@/lib/brand";
import { REFUND_LINE } from "@/lib/copy";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "FAQ",
  description: `Frequently asked questions about ${brand.name}: data storage, Google scopes, billing, and platform changes.`,
  alternates: { canonical: `${siteConfig.url}/docs/faq` },
};

const faqs: Array<{ q: string; a: ReactNode }> = [
  {
    q: "Where does my revenue data live?",
    a: `Order and subscription rows are written into Google Sheets in your Google account. ${brand.name} does not keep a separate full copy of your ledger on our servers. License and billing records for paid plans are stored so we can verify your tier.`,
  },
  {
    q: "Which Google scopes does the add-on use?",
    a: "Only: current spreadsheet (spreadsheets.currentonly), outbound HTTPS for source and license APIs (script.external_request), time-driven triggers (script.scriptapp), and sidebar/menu UI (script.container.ui). No Google Drive, Gmail, or Contacts scopes. See the Privacy policy for Google user data and Limited Use.",
  },
  {
    q: "Can I use more than one storefront?",
    a: "Free allows one source and one store. Pro includes Lemon Squeezy, Polar, Gumroad, and Stripe with scheduled refresh (one store per source). Business is the same on refresh, with up to 20 stores per source rolled into one MRR number.",
  },
  {
    q: "What if Lemon Squeezy shifts toward Stripe Managed Payments?",
    a: (
      <>
        Lemon Squeezy has written about building{" "}
        <a
          href="https://www.lemonsqueezy.com/blog/2026-update"
          rel="noopener noreferrer"
          target="_blank"
        >
          Stripe Managed Payments
        </a>{" "}
        and a path for merchants to move over. Keep history in Sheets so platform changes do not
        erase your analytics trail. You can also connect Stripe directly: see the{" "}
        <Link href="/docs/setup/stripe">Stripe guide</Link> for the sheet-native workflow beside
        Stripe’s payment tools.
      </>
    ),
  },
  {
    q: "How do refunds and cancellations work for my license?",
    a: REFUND_LINE,
  },
  {
    q: "Is the marketing dashboard real customer data?",
    a: "No. The landing demo uses labeled example rows. Your installed sheet starts without customer PII until you connect a store.",
  },
];

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
          <Link href="/pricing">Pricing</Link> · <Link href="/support">Support</Link>
        </p>
      </div>
    </main>
  );
}
