import type { Metadata } from "next";
import Link from "next/link";
import { brand, siteHostname } from "@/lib/brand";
import { siteConfig } from "@/lib/site";
import { privacyEmail } from "@/lib/support";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: `How ${brand.name} handles account, license, and Google user data, including Limited Use disclosure for Google OAuth verification.`,
  alternates: { canonical: `${siteConfig.url}/privacy` },
};

export default function PrivacyPage() {
  const privacy = privacyEmail();
  return (
    <main className="legal container">
      <h1>Privacy policy</h1>
      <div className="prose">
        <p className="mono muted">Last updated: October 10, 2026</p>
        <p>
          {brand.name} (“we”, “us”) operates the website at {siteHostname()} and the {brand.name}{" "}
          Google Sheets add-on. This policy explains what we collect, how Google user data is used,
          how to request deletion, and how to contact us. It is written to support Google OAuth /
          Workspace Marketplace verification, including Limited Use requirements.
        </p>

        <h2>Who we are</h2>
        <p>
          Legal entity name used in communications: {brand.legal.entity}. Support:{" "}
          <Link href="/support">/support</Link>.
          {privacy ? (
            <>
              {" "}
              Privacy contact: <a href={`mailto:${privacy}`}>{privacy}</a>.
            </>
          ) : null}
        </p>

        <h2>Data we process</h2>
        <h3>1. Data in your spreadsheet</h3>
        <p>
          Order, subscription, customer, and refund rows are written into Google Sheets in your
          Google account when you connect Lemon Squeezy, Polar, Gumroad, or Stripe. We do not keep a
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
          Card numbers never touch our servers. Stripe handles payment methods. License records are
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
            <code>spreadsheets.currentonly</code>: read and write only the spreadsheet the add-on
            is opened from
          </li>
          <li>
            <code>script.external_request</code>: HTTPS calls to Lemon Squeezy, Polar, Gumroad,
            Stripe, and our license API
          </li>
          <li>
            <code>script.scriptapp</code>: install time-driven triggers for scheduled refresh
          </li>
          <li>
            <code>script.container.ui</code>: sidebar and menu UI inside Sheets
          </li>
        </ul>
        <p>
          We do not request Google Drive, Gmail, Contacts, or Calendar scopes. Spreadsheet access is
          limited to the file the add-on is opened from (
          <code>spreadsheets.currentonly</code>).
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
            specific messages, it is necessary for security/compliance, or we are required by law,
            and then only with access limited to the minimum needed.
          </li>
        </ul>

        <h2>Subprocessors</h2>
        <p>
          These processors help run the website, license checks, support forms, billing, and the
          add-on runtime. None of them receive your storefront API keys from us.
        </p>
        <ul>
          <li>
            <a href="https://vercel.com">Vercel</a>: hosts the marketing site and API routes, and
            may retain standard HTTP request logs (IP, user agent, URL) for security and reliability
          </li>
          <li>
            <a href="https://upstash.com">Upstash</a>: Redis storage for license records, support
            form submissions, and early-access / launch-invite emails
          </li>
          <li>
            <a href="https://stripe.com">Stripe</a>: Checkout, Customer Portal, subscription state,
            and payment methods (card data never touches our servers)
          </li>
          <li>
            <a href="https://workspace.google.com">Google</a> (Workspace / Apps Script / Sheets):
            runs the add-on in your account and holds spreadsheet rows you sync; source API keys you
            paste stay in Apps Script User Properties
          </li>
        </ul>
        <p>
          Source commerce APIs (Lemon Squeezy, Polar, Gumroad, Stripe) are called directly from your
          Google Apps Script project with keys you store in User Properties. Those keys are not
          sent to our servers for sync.
        </p>

        <h2>Cookies and analytics</h2>
        <p>
          The marketing site does not require an account. We do not use a dark/light theme cookie.
          If we add privacy-preserving analytics later, this page will be updated before those
          scripts run.
        </p>

        <h2>Retention</h2>
        <p>
          Retention matches what the product actually stores today. We do not run automatic
          deletion timers in code, so records we hold stay until you ask us to delete them (or you
          delete them yourself where the product lets you).
        </p>
        <ul>
          <li>
            <strong>Spreadsheet rows and source API keys:</strong> in your Google account. You
            control retention by editing or deleting the sheet, removing keys in the sidebar, or
            uninstalling the add-on.
          </li>
          <li>
            <strong>License records</strong> (key, tier, status, Stripe customer/subscription ids,
            email when provided): stored in Upstash Redis (or a local file in development) until you
            ask us to delete them.
          </li>
          <li>
            <strong>Support submissions</strong> (name, email, subject, message, timestamp): stored
            in Upstash Redis (or a local file in development) until you ask us to delete them.
          </li>
          <li>
            <strong>Early-access / launch-invite emails:</strong> stored (deduped) in Upstash Redis
            (or a local file in development) until you unsubscribe via the one-click link in any
            launch email, or ask us to delete them.
          </li>
          <li>
            <strong>Vercel HTTP logs:</strong> retained under Vercel’s platform defaults for hosting
            security and operations.
          </li>
          <li>
            <strong>Stripe billing records:</strong> retained under{" "}
            <a href="https://stripe.com/privacy">Stripe’s privacy policy</a> for processed payments
            and subscriptions.
          </li>
        </ul>

        <h2>Deletion and access requests</h2>
        <p>You can:</p>
        <ul>
          <li>Delete synced rows or the entire spreadsheet in Google Sheets at any time</li>
          <li>Remove source API keys from the add-on sidebar / script properties</li>
          <li>Uninstall the add-on from the Google Workspace Marketplace / Extensions menu</li>
          <li>
            Unsubscribe from the launch list via the one-click link in any launch email, or request
            deletion of license records, support messages, or launch-invite emails via{" "}
            <Link href="/support">Support</Link>
            {privacy ? (
              <>
                {" "}
                or <a href={`mailto:${privacy}`}>{privacy}</a>
              </>
            ) : null}{" "}
            (Stripe may still retain payment records under its own policy)
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
