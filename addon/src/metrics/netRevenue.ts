import type { NormalizedOrder, NormalizedRefund } from "../importers/types";

const EXCLUDED = new Set(["failed", "pending", "canceled", "cancelled", "incomplete", "requires_payment_method"]);

/**
 * Net revenue in [from, to): gross of collected orders minus refunds.
 * A refunded order that has its own refund row counts gross (the refund row subtracts it);
 * a refunded order with no refund row is skipped. This avoids subtracting a refund twice.
 */
export function netRevenueBetween(
  orders: NormalizedOrder[],
  refunds: NormalizedRefund[],
  from: number,
  to: number,
): number {
  const refundedOrderKeys = new Set(refunds.map((r) => String(r.orderId || "")).filter(Boolean));
  const hasRefundRow = (o: NormalizedOrder) => {
    const id = String(o.id);
    const raw = String(o.rawId || "");
    for (const k of refundedOrderKeys) {
      if (k === id || k === raw || id.endsWith(`_${k}`)) return true;
    }
    return false;
  };
  let n = 0;
  for (const o of orders) {
    const t = Date.parse(o.created);
    if (Number.isNaN(t) || t < from || t >= to) continue;
    const st = String(o.status || "").toLowerCase();
    if (EXCLUDED.has(st)) continue;
    if ((st === "refunded" || st === "chargeback") && !hasRefundRow(o)) continue;
    n += Number(o.amount) || 0;
  }
  for (const r of refunds) {
    const t = Date.parse(r.created);
    if (Number.isNaN(t) || t < from || t >= to) continue;
    const st = String(r.status || "succeeded").toLowerCase();
    if (st === "failed" || st === "canceled") continue;
    n -= Number(r.amount) || 0;
  }
  return Math.round(n * 100) / 100;
}
