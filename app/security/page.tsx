import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/lib/brand";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Security",
  description: `How ${brand.name} handles Google scopes, API keys, license checks, encryption in transit, and subprocessors. Verified against the add-on and API code.`,
  alternates: { canonical: `${siteConfig.url}/security` },
  openGraph: {
    title: `Security · ${brand.name}`,
    description: `Google scopes, API key storage, license checks, and subprocessors for ${brand.name}.`,
    url: `${siteConfig.url}/security`,
  },
};

export default function SecurityPage() {
  return (
    <main className="legal container page-shell">
      <p className="eyebrow">Trust</p>
      <h1>Security</h1>
      <p className="body-lg muted page-lede">
        What the add-on can access, where your keys live, and the one thing that reaches our
        servers. We don&apos;t hold SOC 2 or ISO certifications yet.
      </p>

      <div className="prose">
        <h2>Google OAuth scopes</h2>
        <p>
          The published Apps Script project requests only these scopes (confirm on the consent
          screen at install):
        </p>
        <ul>
          <li>
            <code>spreadsheets.currentonly</code>: read and write only the spreadsheet the add-on
            is opened from
          </li>
          <li>
            <code>script.external_request</code>: outbound HTTPS to Lemon Squeezy, Polar, Gumroad,
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
          We do not request Google Drive, Gmail, Contacts, or Calendar scopes. See the{" "}
          <Link href="/privacy">privacy policy</Link> for Limited Use disclosure.
        </p>

        <h2>API keys stay in your Google account</h2>
        <p>
          Source API keys and tokens you paste in the sidebar are stored with{" "}
          <code>PropertiesService.getUserProperties()</code> for your Google account, not in sheet
          cells, and not in our license database or marketing backend. Sync calls leave Apps Script
          and go straight to the source APIs over HTTPS.
        </p>
        <p>
          <Link href="/docs/api-keys">How to rotate a key</Link>.
        </p>

        <h2>What reaches {brand.name} servers</h2>
        <p>
          From the add-on sync path, the only {brand.name} endpoint contacted is the license verify
          API (<code>POST /api/license/verify</code>). The add-on sends the license key (and, when
          configured, a shared <code>x-license-secret</code> header). The response is tier, status,
          and limits: enough to enforce Free / Pro / Business caps. Store rows and source API keys
          are not uploaded to us for sync.
        </p>
        <p>
          Separately, when you buy a paid plan on the website, Stripe Checkout and webhooks process
          billing email and subscription state so we can issue a license. That is checkout, not the
          revenue sync pipeline. Vercel may also retain standard HTTP logs for the marketing site
          and APIs.
        </p>

        <h2>Encryption in transit</h2>
        <p>
          Source API calls and license checks use HTTPS from Apps Script (
          <code>UrlFetchApp</code>). The website and APIs are served over TLS on Vercel. Spreadsheet
          contents remain under Google’s account controls; we do not operate a separate ledger copy
          on our servers.
        </p>

        <h2>Subprocessors</h2>
        <ul>
          <li>
            <strong>Vercel</strong>: hosts the marketing site and API routes
          </li>
          <li>
            <strong>Upstash</strong>: Redis store for license records in production
          </li>
          <li>
            <strong>Stripe</strong>: Checkout, Customer Portal, and payment methods (card data
            never touches our servers)
          </li>
        </ul>
        <p>
          Google Workspace / Apps Script and Google Sheets are the runtime for the add-on and your
          spreadsheet data. Source platforms (Lemon Squeezy, Polar, Gumroad, Stripe) receive the API
          calls you authorize with your own keys.
        </p>

        <h2>What we do not claim</h2>
        <ul>
          <li>No SOC 2, ISO 27001, HIPAA, or similar certification claims</li>
          <li>No guarantee that a mis-shared spreadsheet cannot expose rows or keys to editors</li>
          <li>No promise that source APIs stay unchanged forever</li>
        </ul>
        <p>
          Questions: see <Link href="/privacy">Privacy</Link> or{" "}
          <Link href="/docs/faq">FAQ</Link>.
        </p>
      </div>
    </main>
  );
}
