import type { NormalizedOrder } from "../importers/types";

export interface TopProduct {
  product: string;
  revenue: number;
  orders: number;
  share: number;
}

export function computeTopProducts(
  orders: NormalizedOrder[],
  windowDays = 30,
  topN = 8,
  asOf: Date = new Date(),
): TopProduct[] {
  const start = asOf.getTime() - windowDays * 86400000;
  const map: Record<string, { revenue: number; orders: number }> = {};

  for (const o of orders) {
    const t = Date.parse(o.created);
    if (Number.isNaN(t) || t < start || t > asOf.getTime()) continue;
    const st = String(o.status || "").toLowerCase();
    if (st === "refunded" || st === "chargeback" || st === "failed") continue;
    const product = o.product || "Unknown";
    if (!map[product]) map[product] = { revenue: 0, orders: 0 };
    map[product].revenue += Number(o.amount) || 0;
    map[product].orders += 1;
  }

  const total = Object.values(map).reduce((a, b) => a + b.revenue, 0) || 1;
  return Object.entries(map)
    .map(([product, v]) => ({
      product,
      revenue: Math.round(v.revenue * 100) / 100,
      orders: v.orders,
      share: Math.round((v.revenue / total) * 1000) / 1000,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, topN);
}
