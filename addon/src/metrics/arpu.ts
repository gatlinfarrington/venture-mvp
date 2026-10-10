import type { NormalizedOrder, NormalizedSubscription } from "../importers/types";
import { computeMrr, isActiveSubscription } from "./mrr";

export interface ArpuResult {
  /** MRR / active subscribers */
  arpu: number;
  activeSubscribers: number;
  mrr: number;
}

export function computeArpu(subscriptions: NormalizedSubscription[]): ArpuResult {
  const mrr = computeMrr(subscriptions);
  const arpu = mrr.activeCount > 0 ? mrr.total / mrr.activeCount : 0;
  return {
    arpu: Math.round(arpu * 100) / 100,
    activeSubscribers: mrr.activeCount,
    mrr: mrr.total,
  };
}

export interface RevenuePeriod {
  thisMonth: number;
  lastMonth: number;
  deltaPct: number;
}

/** Sum paid order amounts (minus obvious refunds if status marks them). */
export function computeRevenuePeriods(
  orders: NormalizedOrder[],
  asOf: Date = new Date(),
): RevenuePeriod {
  const thisStart = new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), 1));
  const lastStart = new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth() - 1, 1));
  const lastEnd = thisStart;

  let thisMonth = 0;
  let lastMonth = 0;

  for (const order of orders) {
    const t = Date.parse(order.created);
    if (Number.isNaN(t)) continue;
    const status = String(order.status || "").toLowerCase();
    if (status === "refunded" || status === "chargeback" || status === "failed") continue;
    const amount = Number(order.amount) || 0;
    if (t >= thisStart.getTime() && t <= asOf.getTime()) thisMonth += amount;
    else if (t >= lastStart.getTime() && t < lastEnd.getTime()) lastMonth += amount;
  }

  const deltaPct =
    lastMonth > 0 ? (thisMonth - lastMonth) / lastMonth : thisMonth > 0 ? 1 : 0;

  return {
    thisMonth: round2(thisMonth),
    lastMonth: round2(lastMonth),
    deltaPct: Math.round(deltaPct * 1000) / 1000,
  };
}

export function revenueByProduct(
  orders: NormalizedOrder[],
  topN = 8,
): { product: string; revenue: number }[] {
  const map: Record<string, number> = {};
  for (const order of orders) {
    const status = String(order.status || "").toLowerCase();
    if (status === "refunded" || status === "chargeback" || status === "failed") continue;
    const product = order.product || "Unknown";
    map[product] = (map[product] || 0) + (Number(order.amount) || 0);
  }
  return Object.entries(map)
    .map(([product, revenue]) => ({ product, revenue: round2(revenue) }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, topN);
}

export function countActiveSubs(subscriptions: NormalizedSubscription[]): number {
  return subscriptions.filter((s) => isActiveSubscription(s.status)).length;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
