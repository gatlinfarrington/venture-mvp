"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const groups = [
  {
    label: "Start",
    links: [{ href: "/docs", label: "Overview" }],
  },
  {
    label: "Setup",
    links: [
      { href: "/docs/setup/lemon-squeezy", label: "Lemon Squeezy setup" },
      { href: "/docs/setup/polar", label: "Polar setup" },
      { href: "/docs/setup/gumroad", label: "Gumroad setup" },
      { href: "/docs/setup/stripe", label: "Stripe setup" },
      { href: "/docs/csv-import", label: "CSV import" },
      { href: "/docs/api-keys", label: "API keys" },
    ],
  },
  {
    label: "Help",
    links: [
      { href: "/docs/faq", label: "FAQ" },
      { href: "/docs/troubleshooting", label: "Troubleshooting" },
    ],
  },
] as const;

export function DocsNav() {
  const pathname = usePathname();

  return (
    <nav className="docs-nav" aria-label="Docs">
      {groups.map((group) => (
        <div key={group.label} className="docs-nav-group">
          <h2 className="docs-group-label mono">{group.label}</h2>
          <ul>
            {group.links.map((link) => {
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
        </div>
      ))}
    </nav>
  );
}
