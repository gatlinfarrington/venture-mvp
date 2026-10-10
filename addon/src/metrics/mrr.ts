import type { NormalizedSubscription } from "../importers/types";
import { toMonthlyAmount as intervalToMonthly } from "../lib/intervals";

export interface MrrBreakdown {
  total: number;
  bySource: Record<string, number>;
  byProduct: Record<string, number>;
  activeCount: number;
  /** Trialing subs (excluded from total unless includeTrialingPastDue). */
  trialingCount: number;
  trialingMrr: number;
  /** Past-due subs (excluded from total unless includeTrialingPastDue). */
  pastDueCount: number;
  pastDueMrr: number;
}

export interface MrrOptions {
  /**
   * When true, trialing + past_due count toward `total` (legacy behavior).
   * Default false — only paid `active` subscriptions contribute to MRR.
   */
  includeTrialingPastDue?: boolean;
}

const TRIAL = new Set(["trialing", "trial", "on_trial"]);
const PAST_DUE = new Set(["past_due", "past-due", "pastdue"]);

export function isTrialingStatus(status: string): boolean {
  return TRIAL.has(String(status || "").toLowerCase());
}

export function isPastDueStatus(status: string): boolean {
  return PAST_DUE.has(String(status || "").toLowerCase());
}

/** Paid active only (excludes trial / past_due / cancelled / paused). */
export function isMrrEligibleStatus(status: string, opts: MrrOptions = {}): boolean {
  const s = String(status || "").toLowerCase();
  if (s === "active") return true;
  if (opts.includeTrialingPastDue && (isTrialingStatus(s) || isPastDueStatus(s))) return true;
  return false;
}

/** @deprecated Prefer isMrrEligibleStatus — kept for older call sites. */
export function isActiveSubscription(status: string): boolean {
  return isMrrEligibleStatus(status, { includeTrialingPastDue: true });
}

export function toMonthlyAmount(
  amount: number,
  interval: NormalizedSubscription["interval"] | string,
): number {
  return intervalToMonthly(amount, interval);
}

export function computeMrr(
  subscriptions: NormalizedSubscription[],
  opts: MrrOptions = {},
): MrrBreakdown {
  const bySource: Record<string, number> = {};
  const byProduct: Record<string, number> = {};
  let total = 0;
  let activeCount = 0;
  let trialingCount = 0;
  let trialingMrr = 0;
  let pastDueCount = 0;
  let pastDueMrr = 0;

  for (const sub of subscriptions) {
    const value = Number(sub.mrr) || 0;
    if (value <= 0) continue;
    const status = String(sub.status || "").toLowerCase();

    if (isTrialingStatus(status)) {
      trialingCount += 1;
      trialingMrr += value;
    } else if (isPastDueStatus(status)) {
      pastDueCount += 1;
      pastDueMrr += value;
    }

    if (!isMrrEligibleStatus(status, opts)) continue;
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
    trialingCount,
    trialingMrr: round2(trialingMrr),
    pastDueCount,
    pastDueMrr: round2(pastDueMrr),
  };
}

/** Build month-end MRR series — paid active only by default (same rules as computeMrr). */
export function computeMrrTrend(
  subscriptions: NormalizedSubscription[],
  months = 12,
  asOf: Date = new Date(),
  opts: MrrOptions = {},
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
      const status = String(sub.status || "").toLowerCase();
      if (status === "paused") continue;
      if (isTrialingStatus(status) || isPastDueStatus(status)) {
        if (!opts.includeTrialingPastDue) continue;
      } else if (status !== "active" && status !== "cancelled" && status !== "expired") {
        continue;
      }
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
