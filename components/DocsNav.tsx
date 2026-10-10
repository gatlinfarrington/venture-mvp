"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/docs", label: "Overview" },
  { href: "/docs/setup/lemon-squeezy", label: "Lemon Squeezy setup" },
  { href: "/docs/setup/polar", label: "Polar setup" },
  { href: "/docs/setup/gumroad", label: "Gumroad setup" },
  { href: "/docs/api-keys", label: "API keys" },
  { href: "/docs/faq", label: "FAQ" },
  { href: "/docs/troubleshooting", label: "Troubleshooting" },
] as const;

export function DocsNav() {
  const pathname = usePathname();

  return (
    <nav className="docs-nav" aria-label="Docs">
      <p className="eyebrow">Help center</p>
      <ul>
        {links.map((link) => {
          const active =
            link.href === "/docs"
              ? pathname === "/docs"
              : pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <li key={link.href}>
              <Link href={link.href} aria-current={active ? "page" : undefined}>
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
