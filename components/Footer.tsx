import Link from "next/link";
import { BrandWordmark } from "@/components/BrandWordmark";
import { brand } from "@/lib/brand";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-col">
            <BrandWordmark />
            <p className="muted" style={{ marginTop: "var(--space-3)", maxWidth: "28ch" }}>
              {brand.pitch}
            </p>
          </div>
          <div className="footer-col">
            <h3>Product</h3>
            <Link href="/#how-it-works">How it works</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/about">About</Link>
            <Link href="/security">Security</Link>
            <Link href="/docs">Docs</Link>
            <Link href="/blog">Blog</Link>
            <Link href="/changelog">Changelog</Link>
            <Link href="/#faq">FAQ</Link>
          </div>
          <div className="footer-col">
            <h3>Sources</h3>
            <Link href="/lemon-squeezy-analytics">Lemon Squeezy</Link>
            <Link href="/polar-analytics">Polar</Link>
            <Link href="/gumroad-analytics-google-sheets">Gumroad</Link>
            <Link href="/stripe-to-google-sheets">Stripe</Link>
            <p className="footer-note">Plus CSV import for anything else.</p>
          </div>
          <div className="footer-col">
            <h3>Guides</h3>
            <Link href="/docs/setup/lemon-squeezy">Lemon Squeezy setup</Link>
            <Link href="/docs/setup/polar">Polar setup</Link>
            <Link href="/docs/setup/gumroad">Gumroad setup</Link>
            <Link href="/docs/setup/stripe">Stripe setup</Link>
            <Link href="/docs/csv-import">CSV import</Link>
            <Link href="/docs/api-keys">API keys</Link>
            <Link href="/stripe-to-google-sheets">Stripe comparison</Link>
            <Link href="/vs/baremetrics">vs Baremetrics</Link>
            <Link href="/vs/chartmogul">vs ChartMogul</Link>
            <Link href="/vs/zapier">vs Zapier</Link>
          </div>
          <div className="footer-col">
            <h3>Legal</h3>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/support">Support</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span className="mono">© {new Date().getFullYear()} {brand.name}</span>
          <span className="muted">Your stores. Your sheet. Our job is the sync.</span>
        </div>
      </div>
    </footer>
  );
}
