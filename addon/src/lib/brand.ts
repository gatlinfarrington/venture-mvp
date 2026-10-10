/**
 * Single source of truth for product naming.
 * Swap `name` (and related strings) here when the brand changes — do not scatter literals.
 */
export const BRAND = {
  /** Product / Marketplace name — change this one field to rebrand. */
  name: "RevenueSheet",
  pitch: "All your stores, in a sheet you own.",
  /** Dashboard header title (left of status meta). */
  dashboardTitle: "Revenue dashboard",
  /** Placeholder logo concept (logo-v2 concept 3). */
  logoMark: "Ledger Cell",
  /** Filename under design/ used when inserting the header mark. */
  logoFile: "ledger-cell-mark-on-dark.png",
  managedNoteSuffix:
    "edits in synced ranges are overwritten · add your own columns to the right of P",
} as const;

export function managedByFooter(extra = "example data"): string {
  return `Managed by ${BRAND.name} · ${BRAND.managedNoteSuffix} · ${extra}`;
}

export function a1ManagedNote(): string {
  return `Managed by ${BRAND.name}: edits are overwritten on sync. Add your own columns to the right.`;
}

/** Inline SVG for Ledger Cell mark (light ink on transparent). */
export const LEDGER_CELL_MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><rect x="6" y="6" width="8" height="8" rx="1" fill="#0D0D0D" opacity="0.14"/><rect x="6" y="16" width="8" height="8" rx="1" fill="#0D0D0D" opacity="0.14"/><rect x="6" y="26" width="8" height="8" rx="1" fill="#0D0D0D" opacity="1"/><rect x="16" y="6" width="8" height="8" rx="1" fill="#0D0D0D" opacity="0.14"/><rect x="16" y="16" width="8" height="8" rx="1" fill="#0D0D0D" opacity="1"/><rect x="16" y="26" width="8" height="8" rx="1" fill="#0D0D0D" opacity="0.14"/><rect x="26" y="6" width="8" height="8" rx="1" fill="#0A7A55" opacity="1"/><rect x="26" y="16" width="8" height="8" rx="1" fill="#0D0D0D" opacity="0.14"/><rect x="26" y="26" width="8" height="8" rx="1" fill="#0D0D0D" opacity="0.14"/></svg>`;

/** Ledger Cell on dark header (white cells + signal-on-dark accent). */
export const LEDGER_CELL_MARK_ON_DARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><g fill="#FFFFFF" opacity="0.22"><rect x="6" y="6" width="8" height="8" rx="1"/><rect x="16" y="6" width="8" height="8" rx="1"/><rect x="6" y="16" width="8" height="8" rx="1"/><rect x="26" y="16" width="8" height="8" rx="1"/><rect x="16" y="26" width="8" height="8" rx="1"/><rect x="26" y="26" width="8" height="8" rx="1"/></g><g fill="#FFFFFF"><rect x="6" y="26" width="8" height="8" rx="1"/><rect x="16" y="16" width="8" height="8" rx="1"/></g><rect x="26" y="6" width="8" height="8" rx="1" fill="#3FBF8C"/></svg>`;
