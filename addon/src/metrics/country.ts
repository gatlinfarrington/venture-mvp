import type { NormalizedOrder } from "../importers/types";

export interface CountryRevenue {
  country: string;
  revenue: number;
  orders: number;
  share: number;
}

/** Aggregate paid order revenue by country (unknown → "ZZ"). */
export function revenueByCountry(
  orders: NormalizedOrder[],
  windowDays = 30,
  topN = 8,
  asOf: Date = new Date(),
): CountryRevenue[] {
  const start = asOf.getTime() - windowDays * 86400000;
  const map: Record<string, { revenue: number; orders: number }> = {};

  for (const o of orders) {
    const t = Date.parse(o.created);
    if (Number.isNaN(t) || t < start || t > asOf.getTime()) continue;
    const st = String(o.status || "").toLowerCase();
    if (st === "refunded" || st === "chargeback" || st === "failed") continue;
    const country = (o.country || "ZZ").toUpperCase();
    if (!map[country]) map[country] = { revenue: 0, orders: 0 };
    map[country].revenue += Number(o.amount) || 0;
    map[country].orders += 1;
  }

  const total = Object.values(map).reduce((a, b) => a + b.revenue, 0) || 1;
  return Object.entries(map)
    .map(([country, v]) => ({
      country,
      revenue: Math.round(v.revenue * 100) / 100,
      orders: v.orders,
      share: Math.round((v.revenue / total) * 1000) / 1000,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, topN);
}
