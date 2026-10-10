import type { NormalizedSubscription } from "../importers/types";
import { isActiveSubscription } from "./mrr";

export interface ChurnResult {
  /** Logo churn rate for the window (cancelled / starting active). */
  rate: number;
  cancelled: number;
  startingActive: number;
  newSubs: number;
  /** Percentage points vs previous window. */
  deltaPts: number;
}

/**
 * Customer (logo) churn over a trailing window ending at `asOf`.
 * rate = cancelled_in_window / active_at_window_start
 */
export function computeChurn(
  subscriptions: NormalizedSubscription[],
  windowDays = 30,
  asOf: Date = new Date(),
): ChurnResult {
  const end = asOf.getTime();
  const start = end - windowDays * 86400000;
  const prevStart = start - windowDays * 86400000;

  const current = windowStats(subscriptions, start, end);
  const previous = windowStats(subscriptions, prevStart, start);

  return {
    rate: current.rate,
    cancelled: current.cancelled,
    startingActive: current.startingActive,
    newSubs: current.newSubs,
    deltaPts: round1((current.rate - previous.rate) * 100), // percentage points
  };
}

function windowStats(
  subscriptions: NormalizedSubscription[],
  startMs: number,
  endMs: number,
): { rate: number; cancelled: number; startingActive: number; newSubs: number } {
  let startingActive = 0;
  let cancelled = 0;
  let newSubs = 0;

  for (const sub of subscriptions) {
    const created = Date.parse(sub.created);
    if (Number.isNaN(created)) continue;
    const cancelledAt = sub.cancelledAt ? Date.parse(sub.cancelledAt) : NaN;

    const activeAtStart =
      created < startMs &&
      (Number.isNaN(cancelledAt) || cancelledAt >= startMs) &&
      (isActiveSubscription(sub.status) || (!Number.isNaN(cancelledAt) && cancelledAt >= startMs));

    if (activeAtStart) startingActive += 1;

    if (!Number.isNaN(cancelledAt) && cancelledAt >= startMs && cancelledAt < endMs) {
      cancelled += 1;
    }
    if (created >= startMs && created < endMs) {
      newSubs += 1;
    }
  }

  const rate = startingActive > 0 ? cancelled / startingActive : 0;
  return {
    rate: Math.round(rate * 10000) / 10000,
    cancelled,
    startingActive,
    newSubs,
  };
}

export function computeNewVsChurnedSeries(
  subscriptions: NormalizedSubscription[],
  months = 12,
  asOf: Date = new Date(),
): { month: string; newSubs: number; churned: number }[] {
  const out: { month: string; newSubs: number; churned: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const monthStart = new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth() - i, 1));
    const monthEnd = new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth() - i + 1, 1));
    const key = `${monthStart.getUTCFullYear()}-${String(monthStart.getUTCMonth() + 1).padStart(2, "0")}`;
    let newSubs = 0;
    let churned = 0;
    for (const sub of subscriptions) {
      const created = Date.parse(sub.created);
      if (!Number.isNaN(created) && created >= monthStart.getTime() && created < monthEnd.getTime()) {
        newSubs += 1;
      }
      if (sub.cancelledAt) {
        const c = Date.parse(sub.cancelledAt);
        if (!Number.isNaN(c) && c >= monthStart.getTime() && c < monthEnd.getTime()) {
          churned += 1;
        }
      }
    }
    out.push({ month: key, newSubs, churned });
  }
  return out;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
