import type { Metadata } from "next";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: `How ${brand.name} handles account, license, and Google Sheets data.`,
};

export default function PrivacyPage() {
  return (
    <main className="legal container">
      <h1>Privacy policy</h1>
      <div className="prose">
        <p className="mono muted">Last updated: October 10, 2026</p>
        <p>
          {brand.name} (“we”) is a Google Sheets add-on that syncs Lemon Squeezy, Polar, and
          Gumroad data into spreadsheets you own. This policy explains what we collect and why.
        </p>
        <h2>Data in your spreadsheet</h2>
        <p>
          Order, subscription, customer, and refund rows are written into Google Sheets in your
          Google account. We do not keep a separate copy of your full revenue ledger on our servers.
          If you uninstall the add-on or delete the sheet, that data remains under your Google
          account controls.
        </p>
        <h2>Account and billing data</h2>
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
        <h2>API keys you paste into the add-on</h2>
        <p>
          Source API keys (Lemon Squeezy, Polar, Gumroad) are stored in Apps Script Properties on
          the spreadsheet’s script project so sync can run. Treat those keys like passwords; rotate
          them if a sheet is shared too widely.
        </p>
        <h2>Google user data</h2>
        <p>
          The add-on uses Google OAuth scopes limited to the spreadsheet it is installed on (and
          related Drive file access required by Apps Script). We do not read Gmail, Contacts, or
          unrelated Drive files. Google user data is used only to operate sync and the dashboard tab.
        </p>
        <h2>Cookies and analytics</h2>
        <p>
          The marketing site may use essential cookies for theme preference. We do not sell personal
          information. If we add privacy-preserving analytics later, this page will be updated.
        </p>
        <h2>Retention</h2>
        <p>
          License and billing records are kept while your subscription is active and for a
          reasonable period afterward for accounting and fraud prevention. You can request deletion
          of license records by emailing {brand.legal.privacyEmail}.
        </p>
        <h2>Contact</h2>
        <p>
          Privacy questions:{" "}
          <a href={`mailto:${brand.legal.privacyEmail}`}>{brand.legal.privacyEmail}</a>
        </p>
      </div>
    </main>
  );
}
