import type { NormalizedOrder, NormalizedRefund } from "../importers/types";

export interface RefundSummary {
  refundAmount: number;
  refundCount: number;
  orderRevenue: number;
  refundRate: number;
}

export function computeRefundSummary(
  orders: NormalizedOrder[],
  refunds: NormalizedRefund[],
  windowDays = 30,
  asOf: Date = new Date(),
): RefundSummary {
  const start = asOf.getTime() - windowDays * 86400000;
  let refundAmount = 0;
  let refundCount = 0;
  let orderRevenue = 0;

  for (const r of refunds) {
    const t = Date.parse(r.created);
    if (Number.isNaN(t) || t < start || t > asOf.getTime()) continue;
    refundAmount += Number(r.amount) || 0;
    refundCount += 1;
  }

  for (const o of orders) {
    const t = Date.parse(o.created);
    if (Number.isNaN(t) || t < start || t > asOf.getTime()) continue;
    const st = String(o.status || "").toLowerCase();
    if (st === "failed") continue;
    orderRevenue += Number(o.amount) || 0;
  }

  const refundRate = orderRevenue > 0 ? refundAmount / orderRevenue : 0;
  return {
    refundAmount: Math.round(refundAmount * 100) / 100,
    refundCount,
    orderRevenue: Math.round(orderRevenue * 100) / 100,
    refundRate: Math.round(refundRate * 10000) / 10000,
  };
}
