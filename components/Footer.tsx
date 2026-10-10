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
            <Link href="/#pricing">Pricing</Link>
            <Link href="/#faq">FAQ</Link>
            <Link href="/success">License</Link>
          </div>
          <div className="footer-col">
            <h3>Sources</h3>
            <Link href="/lemon-squeezy-to-google-sheets">Lemon Squeezy</Link>
            <Link href="/polar-to-google-sheets">Polar</Link>
            <Link href="/gumroad-to-google-sheets">Gumroad</Link>
          </div>
          <div className="footer-col">
            <h3>Guides</h3>
            <Link href="/mrr-spreadsheet-template">MRR template</Link>
            <Link href="/polar-to-google-sheets">Polar → Sheets</Link>
            <Link href="/lemon-squeezy-to-google-sheets">Lemon Squeezy → Sheets</Link>
            <Link href="/gumroad-to-google-sheets">Gumroad → Sheets</Link>
          </div>
          <div className="footer-col">
            <h3>Legal</h3>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <a href={`mailto:${brand.legal.supportEmail}`}>Support</a>
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
