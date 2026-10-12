/** Currencies whose API amounts are already whole units (no cents). Per Stripe's list; Polar/LS follow ISO 4217 minor units. */
const ZERO_DECIMAL = new Set([
  "bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf",
]);

export function isZeroDecimal(currency: unknown): boolean {
  return ZERO_DECIMAL.has(String(currency || "usd").toLowerCase());
}

/** Smallest-unit integer → major units (cents → dollars; JPY stays as-is). */
export function toMajor(amount: unknown, currency: unknown): number {
  const n = Number(amount);
  if (!Number.isFinite(n)) return 0;
  return isZeroDecimal(currency) ? n : Math.round(n) / 100;
}

/**
 * For newest-first lists on incremental runs: true when every row on the page was
 * created before `stopBeforeMs`, so older pages can be skipped.
 */
export function pageIsOlderThan(createdIsoList: string[], stopBeforeMs: number | undefined): boolean {
  if (!stopBeforeMs || !createdIsoList.length) return false;
  return createdIsoList.every((c) => {
    const t = Date.parse(c);
    return !Number.isNaN(t) && t < stopBeforeMs;
  });
}

/** Incremental look-back for orders: re-read recent history so late refunds/status changes land. */
export const ORDER_LOOKBACK_DAYS = 60;

export function incrementalStopBefore(lastSyncedAt: string | undefined, lookbackDays = ORDER_LOOKBACK_DAYS): number | undefined {
  if (!lastSyncedAt) return undefined;
  const t = Date.parse(lastSyncedAt);
  if (Number.isNaN(t)) return undefined;
  return t - lookbackDays * 86400000;
}
