import type { NormalizedSubscription } from "../importers/types";

export type BillingInterval = NormalizedSubscription["interval"];

/**
 * Map vendor recurrence strings to a canonical interval.
 * Handles Gumroad quarterly / biannual / yearly correctly (not as monthly).
 */
export function normalizeBillingInterval(raw: string | null | undefined): BillingInterval {
  const v = String(raw || "month").toLowerCase().replace(/[_-]/g, " ").trim();

  if (
    v.includes("quarter") ||
    v === "q" ||
    v === "3 month" ||
    v === "3 months" ||
    v.includes("every 3")
  ) {
    return "quarter";
  }
  if (
    v.includes("biannual") ||
    v.includes("bi annual") ||
    v.includes("semi annual") ||
    v.includes("semiannual") ||
    v.includes("half year") ||
    v === "6 month" ||
    v === "6 months" ||
    v.includes("every 6")
  ) {
    return "biannual";
  }
  if (v.includes("year") || v === "annual" || v.startsWith("annual ")) return "year";
  if (v.includes("week") || v === "weekly") return "week";
  // Note: "daily".includes("day") is false — check explicitly.
  if (v === "day" || v === "daily" || v.startsWith("day ")) return "day";
  if (v.includes("month") || v === "monthly") return "month";
  return "unknown";
}

/**
 * Convert a billed amount for `interval` into monthly recurring revenue.
 * quarterly → /3, biannual → /6, yearly → /12, weekly → *52/12, daily → *365/12.
 */
export function toMonthlyAmount(amount: number, interval: BillingInterval | string): number {
  const n = Number(amount) || 0;
  const normalized =
    interval === "month" ||
    interval === "year" ||
    interval === "week" ||
    interval === "day" ||
    interval === "quarter" ||
    interval === "biannual" ||
    interval === "unknown"
      ? interval
      : normalizeBillingInterval(String(interval));

  switch (normalized) {
    case "year":
      return n / 12;
    case "quarter":
      return n / 3;
    case "biannual":
      return n / 6;
    case "week":
      return (n * 52) / 12;
    case "day":
      return (n * 365) / 12;
    case "month":
    case "unknown":
    default:
      return n;
  }
}

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}
