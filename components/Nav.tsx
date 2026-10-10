"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandWordmark } from "@/components/BrandWordmark";
import { useTheme } from "@/components/ThemeProvider";
import { siteConfig } from "@/lib/site";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { theme, toggle } = useTheme();

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
          <Link href="/#pricing">Pricing</Link>
          <Link href="/#how-it-works">Docs</Link>
          <Link href="/#faq">Changelog</Link>
        </nav>
        <div className="nav-actions">
          <button
            type="button"
            className="icon-btn"
            onClick={toggle}
            aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          >
            {theme === "light" ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M21 14.5A8.5 8.5 0 1 1 9.5 3a6.5 6.5 0 0 0 11.5 11.5Z" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </svg>
            )}
          </button>
          <a className="btn btn-primary btn-sm" href={siteConfig.installUrl}>
            Install free
          </a>
          <button
            type="button"
            className="icon-btn mobile-nav"
            aria-expanded={open}
            aria-label="Open menu"
            onClick={() => setOpen((v) => !v)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>
      </div>
      {open ? (
        <div className="mobile-drawer container">
          <Link href="/#pricing" onClick={() => setOpen(false)}>Pricing</Link>
          <Link href="/#how-it-works" onClick={() => setOpen(false)}>Docs</Link>
          <Link href="/#faq" onClick={() => setOpen(false)}>FAQ</Link>
          <a href={siteConfig.installUrl}>Install free</a>
        </div>
      ) : null}
    </header>
  );
}
