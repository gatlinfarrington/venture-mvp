/** Runtime configuration. Override LICENSE_API_BASE via Script Properties. */
export const CONFIG = {
  /** Default license verify endpoint (Script Property LICENSE_API_BASE wins). */
  DEFAULT_LICENSE_API_BASE: "https://revenuesheet.app",
  LICENSE_PATH: "/api/license/verify",
  /** Free tier: one connected source, manual refresh only. */
  FREE_MAX_SOURCES: 1,
  /** Paid tiers that unlock schedule + multi-source. */
  PAID_TIERS: ["pro", "multi", "starter", "growth"] as const,
  SYNC_TRIGGER_HANDLER: "runScheduledSync",
  DEFAULT_CURRENCY: "USD",
  PAGE_SIZE: 100,
  MAX_PAGES: 500,
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
  mrrMonthly: "_mrr_monthly",
  chartNewChurn: "_chart_new_churn",
  chartProducts: "_chart_products",
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
