/** Pure helpers for empty / syncing dashboard copy (unit-testable). */

export type BackfillStatus = "synced" | "backfilling" | "not_connected" | "not_imported";

export interface BackfillSourceRow {
  label: string;
  rows: number;
  /** Absolute total from the API when known. */
  totalKnown?: number;
  status: BackfillStatus;
}

/** 28-character mono progress bar (█ filled, ░ empty) + percentage. */
export function progressBarLabel(pct: number): string {
  const clamped = Math.min(1, Math.max(0, pct));
  const filled = Math.round(clamped * 28);
  const bar = `${"█".repeat(filled)}${"░".repeat(28 - filled)}`;
  const pctLabel = `${Math.round(clamped * 100)}%`;
  return `${bar}  ${pctLabel}`;
}

export function progressPctForSource(row: BackfillSourceRow): number {
  if (row.status === "synced") return 1;
  if (row.status === "not_connected" || row.status === "not_imported") return 0;
  if (row.totalKnown && row.totalKnown > 0) {
    return Math.min(1, row.rows / row.totalKnown);
  }
  // Unknown total: show a soft indeterminate fill based on rows so far.
  if (row.rows <= 0) return 0.05;
  return Math.min(0.9, 0.15 + Math.log10(row.rows + 1) / 10);
}

export function statusLabel(status: BackfillStatus): string {
  switch (status) {
    case "synced":
      return "● Synced";
    case "backfilling":
      return "Backfilling · resumes next sync";
    case "not_imported":
      return "Not imported";
    default:
      return "Not connected";
  }
}

/** Left status band while a source is mid-backfill. */
export function syncingStatusLeft(opts: {
  activeLabel: string;
  ordersSoFar: number;
  totalKnown?: number;
}): string {
  const n = opts.ordersSoFar.toLocaleString("en-US");
  if (opts.totalKnown != null && opts.totalKnown > 0) {
    const t = opts.totalKnown.toLocaleString("en-US");
    return `◐ BACKFILLING ${opts.activeLabel.toUpperCase()} · ${n} OF ~${t} ORDERS · NUMBERS WILL CHANGE UNTIL IT FINISHES`;
  }
  return `◐ BACKFILLING ${opts.activeLabel.toUpperCase()} · ${n} ORDERS SO FAR · NUMBERS WILL CHANGE UNTIL IT FINISHES`;
}

/** Right status band: last update + any source already done. */
export function syncingStatusRight(opts: {
  lastUpdate: string;
  doneLabels: string[];
}): string {
  const time = opts.lastUpdate || "·";
  if (opts.doneLabels.length) {
    return `LAST UPDATE ${time} · ${opts.doneLabels.map((l) => l.toUpperCase()).join(", ")} DONE`;
  }
  return `LAST UPDATE ${time}`;
}

export const EMPTY_STATUS_LEFT =
  "○ NOT CONNECTED · EXTENSIONS → REVENUESHEET → OPEN SIDEBAR";
export const EMPTY_STATUS_RIGHT = "NO DATA YET";

export const EMPTY_STEPS = [
  {
    n: "01",
    title: "Open the sidebar",
    body: "Extensions → RevenueSheet → Open sidebar.",
  },
  {
    n: "02",
    title: "Paste your license key",
    body: "Paid plans only. Free works without a key, with one source and manual refresh.",
  },
  {
    n: "03",
    title: "Connect a source",
    body: "Stripe, Lemon Squeezy, Polar or Gumroad key, or Import CSV… from the menu. Save starts the backfill.",
  },
] as const;

export const EMPTY_CHART_COPY =
  "Charts appear here after your first sync. They read from the MRR monthly tab, so you can chart it yourself too.";

export const SYNCING_CHART_COPY =
  "Charts draw once the backfill finishes, so the history isn't half a picture. Large stores can take a few syncs.";

export const SCHEDULE_NEEDS_LICENSE =
  "Paste your license key in the sidebar (License & display).";
