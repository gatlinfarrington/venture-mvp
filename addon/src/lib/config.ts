/** Runtime configuration. Override LICENSE_API_BASE via Script Properties. */
export const CONFIG = {
  /** Default license verify endpoint (Script Property LICENSE_API_BASE wins). */
  DEFAULT_LICENSE_API_BASE: "https://revenuesheet.app",
  LICENSE_PATH: "/api/license/verify",
  /** Free tier: one connected source, manual refresh only. */
  FREE_MAX_SOURCES: 1,
  /** Paid tiers that unlock schedule + multi-source (matches site Tier). */
  PAID_TIERS: ["pro", "business"] as const,
  SYNC_TRIGGER_HANDLER: "runScheduledSync",
  DEFAULT_CURRENCY: "USD",
  PAGE_SIZE: 100,
  MAX_PAGES: 500 as number,
  /**
   * Pages fetched per Apps Script execution. Large backfills persist a cursor
   * and continue on the next sync / scheduled trigger (~6 min GAS limit).
   */
  MAX_PAGES_PER_RUN: 40 as number,
  RATE_LIMIT_RETRIES: 5,
  RATE_LIMIT_BASE_MS: 1000,
} as const;

export type SourceId = "lemon_squeezy" | "polar" | "gumroad";

export const SOURCES: { id: SourceId; label: string; keyProp: string }[] = [
  { id: "lemon_squeezy", label: "Lemon Squeezy", keyProp: "API_KEY_LEMON_SQUEEZY" },
  { id: "polar", label: "Polar", keyProp: "API_KEY_POLAR" },
  { id: "gumroad", label: "Gumroad", keyProp: "API_KEY_GUMROAD" },
];

export const SHEET_NAMES = {
  dashboard: "Dashboard",
  orders: "Orders",
  subscriptions: "Subscriptions",
  customers: "Customers",
  refunds: "Refunds",
  settings: "Settings",
  /** Visible chart-data tab (launch v2); named range rs_mrr_monthly. */
  mrrMonthly: "MRR monthly",
} as const;

export function getLicenseApiBase(): string {
  try {
    const fromScript = PropertiesService.getScriptProperties().getProperty("LICENSE_API_BASE");
    if (fromScript && fromScript.trim()) return fromScript.replace(/\/$/, "");
  } catch {
    /* unit tests / non-GAS */
  }
  return CONFIG.DEFAULT_LICENSE_API_BASE;
}
