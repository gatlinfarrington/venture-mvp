"use client";

import type { MouseEventHandler } from "react";
import { marketplaceUrlClient } from "@/lib/marketplace-client";

type Props = {
  children: string;
  className?: string;
  source?: string;
  /** When no Marketplace URL, scroll to this hash (default #launch). */
  launchHref?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
};

/**
 * Install CTA. Links to the Marketplace listing when NEXT_PUBLIC_MARKETPLACE_URL
 * (or INSTALL_URL) is set; otherwise jumps to the launch-invite capture (#launch).
 * Never links to the generic Workspace Marketplace homepage.
 */
export function InstallCta({
  children,
  className,
  launchHref = "/#launch",
  onClick,
}: Props) {
  const listing = marketplaceUrlClient();

  return (
    <a className={className} href={listing || launchHref} onClick={onClick}>
      {children}
    </a>
  );
}
