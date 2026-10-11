"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandWordmark } from "@/components/BrandWordmark";
import { InstallCta } from "@/components/InstallCta";
import { marketplaceUrlClient } from "@/lib/marketplace-client";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const listing = marketplaceUrlClient();
  const ctaLabel = listing ? "Install free" : "Join the launch list";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`site-header${scrolled ? " is-scrolled" : ""}`}>
      <div className="container nav-inner">
        <BrandWordmark />
        <nav className="nav-links" aria-label="Primary">
          <Link href="/pricing">Pricing</Link>
          <Link href="/sample">Sample</Link>
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/#faq">FAQ</Link>
          <Link href="/docs">Docs</Link>
          <Link href="/blog">Blog</Link>
          <Link href="/changelog">Changelog</Link>
        </nav>
        <div className="nav-actions">
          <InstallCta className="btn btn-primary btn-sm nav-cta-desktop" source="nav">
            {ctaLabel}
          </InstallCta>
          <button
            type="button"
            className="icon-btn mobile-nav"
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              {open ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>
      </div>
      {open ? (
        <div className="mobile-drawer container">
          <InstallCta source="nav-mobile" onClick={() => setOpen(false)}>
            {ctaLabel}
          </InstallCta>
          <Link href="/pricing" onClick={() => setOpen(false)}>
            Pricing
          </Link>
          <Link href="/sample" onClick={() => setOpen(false)}>
            Sample
          </Link>
          <Link href="/#how-it-works" onClick={() => setOpen(false)}>
            How it works
          </Link>
          <Link href="/#faq" onClick={() => setOpen(false)}>
            FAQ
          </Link>
          <Link href="/docs" onClick={() => setOpen(false)}>
            Docs
          </Link>
          <Link href="/blog" onClick={() => setOpen(false)}>
            Blog
          </Link>
          <Link href="/changelog" onClick={() => setOpen(false)}>
            Changelog
          </Link>
        </div>
      ) : null}
    </header>
  );
}
