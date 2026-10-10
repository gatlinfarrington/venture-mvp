import type { NormalizedSubscription } from "../importers/types";

export type BillingInterval = NormalizedSubscription["interval"];

/**
 * Map vendor recurrence strings to a canonical interval.
 * Handles Gumroad quarterly / biannual / every_two_years / yearly correctly.
 *
 * Naming note:
 * - biannual / semi-annual = twice per year → /6
 * - biennial / every_two_years = once every two years → /24
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

  // Twice per year (before "year" / "annual" checks).
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

  // Once every two years — MUST run before includes("year"), otherwise
  // "every_two_years" / "every two years" is misclassified as yearly (/12).
  if (
    v.includes("biennial") ||
    v.includes("bi yearly") ||
    v.includes("biyearly") ||
    v.includes("every two year") ||
    v.includes("every 2 year") ||
    v === "2 year" ||
    v === "2 years" ||
    v === "two year" ||
    v === "two years"
  ) {
    return "biennial";
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
 * quarterly → /3, biannual → /6, yearly → /12, biennial → /24,
 * weekly → *52/12, daily → *365/12.
 */
export function toMonthlyAmount(amount: number, interval: BillingInterval | string): number {
  const n = Number(amount) || 0;
  const known: BillingInterval[] = [
    "month",
    "year",
    "week",
    "day",
    "quarter",
    "biannual",
    "biennial",
    "unknown",
  ];
  const normalized = known.includes(interval as BillingInterval)
    ? (interval as BillingInterval)
    : normalizeBillingInterval(String(interval));

  switch (normalized) {
    case "year":
      return n / 12;
    case "biennial":
      return n / 24;
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
