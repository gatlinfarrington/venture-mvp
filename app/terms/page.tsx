import type { Metadata } from "next";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Terms of service",
  description: `Terms for using the ${brand.name} Google Sheets add-on and website.`,
};

export default function TermsPage() {
  return (
    <main className="legal container">
      <h1>Terms of service</h1>
      <div className="prose">
        <p className="mono muted">Last updated: October 10, 2026</p>
        <p>
          By installing {brand.name} or purchasing a license, you agree to these terms. If you do
          not agree, do not use the add-on.
        </p>
        <h2>The service</h2>
        <p>
          {brand.name} syncs commerce data from supported sources into Google Sheets and builds an
          MRR-oriented dashboard tab. Features and source coverage may change; Free, Pro, and
          Business tiers are described on the pricing page.
        </p>
        <h2>Your responsibilities</h2>
        <ul>
          <li>You must have the right to use any API keys you connect.</li>
          <li>You are responsible for how you share spreadsheets that contain customer emails and order data.</li>
          <li>You will not abuse rate limits or attempt to reverse-engineer source APIs through the add-on in ways that violate those platforms’ terms.</li>
        </ul>
        <h2>Billing</h2>
        <p>
          Paid plans are billed through Stripe. Annual plans charge for ten months of the monthly
          price (two months free). Cancel anytime; access continues through the paid period unless a
          refund is issued.
        </p>
        <h2>Refunds</h2>
        <p>
          First-time charges may be refunded within 14 days on request to{" "}
          {brand.legal.supportEmail}. After that, cancellations stop future renewals.
        </p>
        <h2>Disclaimer</h2>
        <p>
          The dashboard and sync are provided “as is.” Example data on the marketing site is labeled
          and is not customer data. We do not guarantee uninterrupted sync if a source API changes
          or is unavailable.
        </p>
        <h2>Limitation of liability</h2>
        <p>
          To the extent permitted by law, our total liability for claims relating to the service is
          limited to the amounts you paid us in the three months before the claim.
        </p>
        <h2>Contact</h2>
        <p>
          <a href={`mailto:${brand.legal.supportEmail}`}>{brand.legal.supportEmail}</a>
        </p>
      </div>
    </main>
  );
}
