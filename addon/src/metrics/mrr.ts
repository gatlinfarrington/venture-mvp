import type { NormalizedSubscription } from "../importers/types";

export interface MrrBreakdown {
  total: number;
  bySource: Record<string, number>;
  byProduct: Record<string, number>;
  activeCount: number;
}

const ACTIVE = new Set(["active", "trialing", "trial", "past_due", "on_trial"]);

export function isActiveSubscription(status: string): boolean {
  return ACTIVE.has(String(status || "").toLowerCase());
}

/** Normalize interval amount to monthly recurring revenue. */
export function toMonthlyAmount(
  amount: number,
  interval: NormalizedSubscription["interval"] | string,
): number {
  const n = Number(amount) || 0;
  switch (String(interval || "month").toLowerCase()) {
    case "year":
    case "yearly":
    case "annual":
      return n / 12;
    case "week":
    case "weekly":
      return (n * 52) / 12;
    case "day":
    case "daily":
      return (n * 365) / 12;
    case "month":
    case "monthly":
    default:
      return n;
  }
}

export function computeMrr(subscriptions: NormalizedSubscription[]): MrrBreakdown {
  const bySource: Record<string, number> = {};
  const byProduct: Record<string, number> = {};
  let total = 0;
  let activeCount = 0;

  for (const sub of subscriptions) {
    if (!isActiveSubscription(sub.status)) continue;
    const monthly = sub.mrr > 0 ? sub.mrr : toMonthlyAmount(sub.mrr, sub.interval);
    // Prefer explicit mrr field (already monthly); if mapper set mrr correctly, use it.
    const value = Number(sub.mrr) || 0;
    if (value <= 0) continue;
    activeCount += 1;
    total += value;
    bySource[sub.source] = (bySource[sub.source] || 0) + value;
    const product = sub.product || "Unknown";
    byProduct[product] = (byProduct[product] || 0) + value;
  }

  return {
    total: round2(total),
    bySource: mapRound(bySource),
    byProduct: mapRound(byProduct),
    activeCount,
  };
}

/** Build month-end MRR series from subscription create/cancel history. */
export function computeMrrTrend(
  subscriptions: NormalizedSubscription[],
  months = 12,
  asOf: Date = new Date(),
): { month: string; mrr: number; bySource: Record<string, number> }[] {
  const points: { month: string; mrr: number; bySource: Record<string, number> }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const end = endOfMonth(addMonths(asOf, -i));
    const monthKey = `${end.getUTCFullYear()}-${String(end.getUTCMonth() + 1).padStart(2, "0")}`;
    const bySource: Record<string, number> = {};
    let mrr = 0;
    for (const sub of subscriptions) {
      const created = parseDate(sub.created);
      if (!created || created > end) continue;
      const cancelled = sub.cancelledAt ? parseDate(sub.cancelledAt) : null;
      if (cancelled && cancelled <= end) continue;
      // Treat as active at month-end if not cancelled by then (include past_due historically)
      const status = String(sub.status || "").toLowerCase();
      if (status === "expired" && cancelled && cancelled <= end) continue;
      const value = Number(sub.mrr) || 0;
      if (value <= 0) continue;
      mrr += value;
      bySource[sub.source] = (bySource[sub.source] || 0) + value;
    }
    points.push({ month: monthKey, mrr: round2(mrr), bySource: mapRound(bySource) });
  }
  return points;
}

function parseDate(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function addMonths(date: Date, delta: number): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  d.setUTCMonth(d.getUTCMonth() + delta);
  return d;
}

function endOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function mapRound(obj: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(obj)) out[k] = round2(v);
  return out;
}
