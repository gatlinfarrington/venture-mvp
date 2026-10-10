import type { Metadata } from "next";
import { brand } from "@/lib/brand";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: `How ${brand.name} handles account, license, and Google user data — including Limited Use disclosure for Google OAuth verification.`,
  alternates: { canonical: `${siteConfig.url}/privacy` },
};

export default function PrivacyPage() {
  return (
    <main className="legal container">
      <h1>Privacy policy</h1>
      <div className="prose">
        <p className="mono muted">Last updated: October 10, 2026</p>
        <p>
          {brand.name} (“we”, “us”) operates the website at {brand.domain} and the {brand.name}{" "}
          Google Sheets add-on. This policy explains what we collect, how Google user data is used,
          how to request deletion, and how to contact us. It is written to support Google OAuth /
          Workspace Marketplace verification, including Limited Use requirements.
        </p>

        <h2>Who we are</h2>
        <p>
          Legal entity name used in communications: {brand.legal.entity}. Privacy contact:{" "}
          <a href={`mailto:${brand.legal.privacyEmail}`}>{brand.legal.privacyEmail}</a>. Support:{" "}
          <a href={`mailto:${brand.legal.supportEmail}`}>{brand.legal.supportEmail}</a>.
        </p>

        <h2>Data we process</h2>
        <h3>1. Data in your spreadsheet</h3>
        <p>
          Order, subscription, customer, and refund rows are written into Google Sheets in your
          Google account when you connect Lemon Squeezy, Polar, or Gumroad. We do not keep a
          separate full copy of your revenue ledger on {brand.name} servers. If you uninstall the
          add-on or delete the sheet, that spreadsheet data remains under your Google account
          controls.
        </p>
        <h3>2. Source API keys</h3>
        <p>
          API keys or access tokens you paste into the add-on are stored in Apps Script User
          Properties for your Google account (not in the sheet cells, and not on{" "}
          {brand.name} servers) so sync can call the source APIs. Those keys are not stored in our
          license database or marketing backend.
        </p>
        <h3>3. Account and billing data</h3>
        <p>When you purchase a paid plan we process, through Stripe:</p>
        <ul>
          <li>Email address</li>
          <li>Subscription and payment status</li>
          <li>A generated license key tied to your tier</li>
        </ul>
        <p>
          Card numbers never touch our servers — Stripe handles payment methods. License records are
          stored in our license database (Upstash Redis in production, or a local store in
          development) so the add-on can verify tier limits.
        </p>
        <h3>4. Website logs</h3>
        <p>
          Our hosting provider (Vercel) may process standard server logs (IP address, user agent,
          URL) for security and reliability. We do not sell personal information.
        </p>

        <h2>Google user data</h2>
        <p>
          The add-on uses Google OAuth / Apps Script authorization limited to these scopes:
        </p>
        <ul>
          <li>
            <code>spreadsheets.currentonly</code> — read and write only the spreadsheet the add-on
            is opened from
          </li>
          <li>
            <code>script.external_request</code> — HTTPS calls to Lemon Squeezy, Polar, Gumroad, and
            our license API
          </li>
          <li>
            <code>script.scriptapp</code> — install time-driven triggers for scheduled refresh
          </li>
          <li>
            <code>script.container.ui</code> — sidebar and menu UI inside Sheets
          </li>
        </ul>
        <p>
          We do not request Google Drive, Gmail, Contacts, or Calendar scopes, and we do not read
          other Drive files.
        </p>
        <p>Google user data (contents of the current spreadsheet) is used only to:</p>
        <ul>
          <li>Create and update tabs the add-on manages</li>
          <li>Write synced commerce rows and dashboard formulas</li>
          <li>Read settings the user keeps in the sheet and keys/license state in User Properties</li>
        </ul>

        <h2>Google API Services Limited Use disclosure</h2>
        <p>
          {brand.name}’s use and transfer to any other app of information received from Google APIs
          will adhere to the{" "}
          <a href="https://developers.google.com/terms/api-services-user-data-policy">
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements.
        </p>
        <ul>
          <li>
            We use Google user data only to provide and improve user-facing features that are
            prominent in the add-on’s interface (sync and dashboard in Sheets).
          </li>
          <li>
            We do not use Google user data for serving advertisements, including retargeting,
            personalized, or interest-based advertising.
          </li>
          <li>
            We do not sell Google user data or transfer it to third parties except as necessary to
            provide or improve features (for example, infrastructure subprocessors that process data
            on our behalf under contract), for security/compliance, or if you direct us to.
          </li>
          <li>
            We do not allow humans to read Google user data unless you give affirmative consent for
            specific messages, it is necessary for security/compliance, or we are required by law —
            and then only with access limited to the minimum needed.
          </li>
        </ul>

        <h2>Cookies and analytics</h2>
        <p>
          The marketing site does not require an account. We do not use a dark/light theme cookie.
          If we add privacy-preserving analytics later, this page will be updated before those
          scripts run.
        </p>

        <h2>Retention</h2>
        <p>
          License and billing records are kept while your subscription is active and for a
          reasonable period afterward for accounting, tax, and fraud prevention (typically up to
          seven years for financial records where required). Spreadsheet data retention is controlled
          by you in Google Sheets / Drive.
        </p>

        <h2>Deletion and access requests</h2>
        <p>You can:</p>
        <ul>
          <li>Delete synced rows or the entire spreadsheet in Google Drive at any time</li>
          <li>Remove source API keys from the add-on sidebar / script properties</li>
          <li>Uninstall the add-on from the Google Workspace Marketplace / Extensions menu</li>
          <li>
            Request deletion of license and billing records we store by emailing{" "}
            <a href={`mailto:${brand.legal.privacyEmail}`}>{brand.legal.privacyEmail}</a> from the
            email on your receipt (we may retain minimal records required for legal or accounting
            obligations)
          </li>
        </ul>
        <p>
          We aim to respond to verifiable deletion and access requests within 30 days. Stripe may
          retain payment records under its own policy for processed charges.
        </p>

        <h2>Children</h2>
        <p>
          The service is directed at businesses and adult operators. We do not knowingly collect
          personal information from children under 13 (or under 16 where that is the applicable
          age).
        </p>

        <h2>International transfers</h2>
        <p>
          We may process data in the United States and other countries where our subprocessors
          operate. Where required, we use appropriate contractual safeguards.
        </p>

        <h2>Changes</h2>
        <p>
          We may update this policy. The “Last updated” date will change; material changes affecting
          Google user data use will be highlighted for Marketplace users when required.
        </p>

        <h2>Contact</h2>
        <p>
          Privacy:{" "}
          <a href={`mailto:${brand.legal.privacyEmail}`}>{brand.legal.privacyEmail}</a>
          <br />
          Support:{" "}
          <a href={`mailto:${brand.legal.supportEmail}`}>{brand.legal.supportEmail}</a>
        </p>
      </div>
    </main>
  );
}
