import type { Metadata } from "next";
import Link from "next/link";
import { brand, siteHostname } from "@/lib/brand";
import { REFUND_LINE } from "@/lib/copy";
import { checkoutEnabled, siteConfig } from "@/lib/site";
import { privacyEmail } from "@/lib/support";

export const metadata: Metadata = {
  title: "Terms of service",
  description: `Terms for using the ${brand.name} Google Sheets add-on and website, including acceptable use, billing, and Google user data.`,
  alternates: { canonical: `${siteConfig.url}/terms` },
};

export default function TermsPage() {
  const privacy = privacyEmail();
  const paidOpen = checkoutEnabled;
  return (
    <main className="legal container">
      <h1>Terms of service</h1>
      <div className="prose">
        <p className="mono muted">Last updated: October 12, 2026</p>
        <p>
          By installing {brand.name}, using {siteHostname()}, or purchasing a license, you agree to
          these terms. If you do not agree, do not use the add-on or website.
        </p>

        <h2>The service</h2>
        <p>
          {brand.name} syncs commerce data from supported sources (Lemon Squeezy, Polar, Gumroad,
          and Stripe) into Google Sheets and builds an MRR-oriented dashboard tab. Features and
          source coverage may change. Free, Pro, and Business tiers are described on the{" "}
          <Link href="/pricing">pricing</Link> page.{" "}
          {paidOpen
            ? "Paid plans can be purchased on this site. The add-on is not listed on the Google Workspace Marketplace yet (pending Google review)."
            : "Paid plans open with the Google Workspace Marketplace listing; the add-on is not listed yet (pending Google review)."}
        </p>

        <h2>Accounts and eligibility</h2>
        <p>
          You must be able to enter into a binding agreement and have the right to connect any store
          API keys you use. You are responsible for activity under your Google account and license
          key.
        </p>

        <h2>Google user data</h2>
        <p>
          The add-on accesses Google user data only as described in our{" "}
          <Link href="/privacy">Privacy policy</Link>, including the Google API Services Limited Use
          disclosure. Scopes are limited to per-file access for the Sheet you open with the add-on (
          <code>drive.file</code>), Sheets access to that file (
          <code>spreadsheets.currentonly</code>), outbound HTTPS for sync and license checks,
          time-driven triggers, and the sidebar/menu UI (not broad Drive, Gmail, or Contacts). You
          authorize us to read and write that spreadsheet to operate sync and the dashboard. You
          must not use the add-on to process data you are not allowed to store in Google Sheets.
        </p>

        <h2>Your responsibilities</h2>
        <ul>
          <li>You must have the right to use any API keys you connect.</li>
          <li>
            You are responsible for how you share spreadsheets that contain customer emails and
            order data.
          </li>
          <li>
            You will not abuse rate limits or attempt to reverse-engineer source APIs through the
            add-on in ways that violate those platforms’ terms.
          </li>
          <li>
            You will not use the service for unlawful content, spam, or to circumvent another
            product’s access controls.
          </li>
        </ul>

        <h2>Billing and licenses</h2>
        <p>
          {paidOpen
            ? "Paid plans (Pro and Business) are sold on this site and billed monthly through Stripe Checkout."
            : "When paid plans are on sale, Pro and Business are billed monthly through Stripe Checkout."}{" "}
          Cancel anytime; access continues through the paid period unless a refund is issued.
          License keys are personal to you (or your organization on Business) and may not be resold.
        </p>

        <h2>Refunds</h2>
        <p>
          {REFUND_LINE} Questions go to <Link href="/support">Support</Link>.
        </p>

        <h2>Intellectual property</h2>
        <p>
          The website, add-on code, and branding are owned by {brand.legal.entity} or its licensors.
          You retain ownership of your spreadsheet content and store data.
        </p>

        <h2>Disclaimer</h2>
        <p>
          The dashboard and sync are provided “as is.” Example data on the marketing site is labeled
          and is not customer data. We do not guarantee uninterrupted sync if a source API changes
          or is unavailable, or if Google Apps Script quotas are exceeded.
        </p>

        <h2>Limitation of liability</h2>
        <p>
          To the extent permitted by law, our total liability for claims relating to the service is
          limited to the amounts you paid us in the three months before the claim. We are not liable
          for lost profits, lost data in your Google account (maintain your own sheet backups), or
          indirect damages.
        </p>

        <h2>Termination</h2>
        <p>
          You may stop using the add-on at any time and uninstall it. We may suspend access for
          non-payment, abuse, or legal risk. Provisions on liability, IP, and privacy survive
          termination.
        </p>

        <h2>Changes</h2>
        <p>
          We may update these terms. Continued use after the “Last updated” date constitutes
          acceptance of material changes we notify through the site or add-on when required.
        </p>

        <h2>Contact</h2>
        <p>
          Support: <Link href="/support">/support</Link>
          {privacy ? (
            <>
              <br />
              Privacy: <a href={`mailto:${privacy}`}>{privacy}</a>
            </>
          ) : null}
        </p>
      </div>
    </main>
  );
}
