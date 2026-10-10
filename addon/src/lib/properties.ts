import {
  SOURCES,
  type DashboardTemplate,
  type ScheduleCadence,
  type SourceId,
} from "./config";

const LICENSE_KEY_PROP = "LICENSE_KEY";
const CURRENCY_PROP = "DISPLAY_CURRENCY";
const CURSOR_PREFIX = "SYNC_CURSOR_";
const LAST_SYNC_PROP = "LAST_SYNC_AT";
const DEMO_MODE_PROP = "DEMO_MODE";
const INCLUDE_TRIAL_PAST_DUE_PROP = "MRR_INCLUDE_TRIAL_PAST_DUE";
const MRR_GOAL_PROP = "MRR_GOAL";
const SCHEDULE_CADENCE_PROP = "SCHEDULE_CADENCE";
const EMAIL_DIGEST_PROP = "EMAIL_DIGEST_OPT_IN";
const TEMPLATE_PROP = "DASHBOARD_TEMPLATE";
const CSV_MAP_PROP = "CSV_COLUMN_MAP";

function userProps(): GoogleAppsScript.Properties.Properties {
  return PropertiesService.getUserProperties();
}

export function getApiKey(source: SourceId): string {
  const meta = SOURCES.find((s) => s.id === source);
  if (!meta) return "";
  return userProps().getProperty(meta.keyProp) || "";
}

export function setApiKey(source: SourceId, key: string): void {
  const meta = SOURCES.find((s) => s.id === source);
  if (!meta) throw new Error(`Unknown source: ${source}`);
  if (!key || !key.trim()) {
    userProps().deleteProperty(meta.keyProp);
  } else {
    userProps().setProperty(meta.keyProp, key.trim());
  }
}

export function getConnectedSources(): SourceId[] {
  return SOURCES.filter((s) => !!getApiKey(s.id)).map((s) => s.id);
}

export function getLicenseKey(): string {
  return userProps().getProperty(LICENSE_KEY_PROP) || "";
}

export function setLicenseKey(key: string): void {
  if (!key || !key.trim()) userProps().deleteProperty(LICENSE_KEY_PROP);
  else userProps().setProperty(LICENSE_KEY_PROP, key.trim());
}

export function getDisplayCurrency(): string {
  return userProps().getProperty(CURRENCY_PROP) || "USD";
}

export function setDisplayCurrency(code: string): void {
  userProps().setProperty(CURRENCY_PROP, (code || "USD").toUpperCase());
}

export function getSyncCursor(source: SourceId): import("../importers/types").SyncCursor {
  const raw = userProps().getProperty(CURSOR_PREFIX + source);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as import("../importers/types").SyncCursor;
  } catch {
    return {};
  }
}

export function setSyncCursor(
  source: SourceId,
  cursor: import("../importers/types").SyncCursor,
): void {
  userProps().setProperty(CURSOR_PREFIX + source, JSON.stringify(cursor));
}

export function getIncludeTrialingPastDue(): boolean {
  return userProps().getProperty(INCLUDE_TRIAL_PAST_DUE_PROP) === "1";
}

export function setIncludeTrialingPastDue(on: boolean): void {
  if (on) userProps().setProperty(INCLUDE_TRIAL_PAST_DUE_PROP, "1");
  else userProps().deleteProperty(INCLUDE_TRIAL_PAST_DUE_PROP);
}

export function clearSyncCursor(source: SourceId): void {
  userProps().deleteProperty(CURSOR_PREFIX + source);
}

export function getLastSyncAt(): string {
  return userProps().getProperty(LAST_SYNC_PROP) || "";
}

export function setLastSyncAt(iso: string): void {
  userProps().setProperty(LAST_SYNC_PROP, iso);
}

export function isDemoMode(): boolean {
  return userProps().getProperty(DEMO_MODE_PROP) === "1";
}

export function setDemoMode(on: boolean): void {
  if (on) userProps().setProperty(DEMO_MODE_PROP, "1");
  else userProps().deleteProperty(DEMO_MODE_PROP);
}

export function getMrrGoal(): number {
  const raw = userProps().getProperty(MRR_GOAL_PROP);
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function setMrrGoal(goal: number): void {
  if (!goal || goal <= 0) userProps().deleteProperty(MRR_GOAL_PROP);
  else userProps().setProperty(MRR_GOAL_PROP, String(goal));
}

export function getScheduleCadence(): ScheduleCadence {
  const raw = userProps().getProperty(SCHEDULE_CADENCE_PROP) || "hourly";
  if (raw === "every_6h" || raw === "daily" || raw === "weekly" || raw === "hourly") return raw;
  return "hourly";
}

export function setScheduleCadence(cadence: ScheduleCadence): void {
  userProps().setProperty(SCHEDULE_CADENCE_PROP, cadence);
}

export function isEmailDigestOptIn(): boolean {
  return userProps().getProperty(EMAIL_DIGEST_PROP) === "1";
}

export function setEmailDigestOptIn(on: boolean): void {
  if (on) userProps().setProperty(EMAIL_DIGEST_PROP, "1");
  else userProps().deleteProperty(EMAIL_DIGEST_PROP);
}

export function getDashboardTemplate(): DashboardTemplate {
  const raw = userProps().getProperty(TEMPLATE_PROP) || "growth";
  return raw === "classic" ? "classic" : "growth";
}

export function setDashboardTemplate(template: DashboardTemplate): void {
  userProps().setProperty(TEMPLATE_PROP, template);
}

export function getCsvColumnMap(): Record<string, string> {
  const raw = userProps().getProperty(CSV_MAP_PROP);
  if (!raw) {
    return {
      id: "id",
      created: "created",
      product: "product",
      email: "email",
      amount: "amount",
      currency: "currency",
      status: "status",
      country: "country",
      mrr: "mrr",
      kind: "kind",
    };
  }
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

export function setCsvColumnMap(map: Record<string, string>): void {
  userProps().setProperty(CSV_MAP_PROP, JSON.stringify(map));
}

export function getAllSettingsForSidebar(): Record<string, unknown> {
  return {
    lemonSqueezy: getApiKey("lemon_squeezy") ? "••••••••" : "",
    polar: getApiKey("polar") ? "••••••••" : "",
    gumroad: getApiKey("gumroad") ? "••••••••" : "",
    stripe: getApiKey("stripe") ? "••••••••" : "",
    licenseKey: getLicenseKey() ? "••••••••" : "",
    currency: getDisplayCurrency(),
    lastSyncAt: getLastSyncAt(),
    demoMode: isDemoMode(),
    includeTrialingPastDue: getIncludeTrialingPastDue(),
    mrrGoal: getMrrGoal() || "",
    scheduleCadence: getScheduleCadence(),
    emailDigest: isEmailDigestOptIn(),
    template: getDashboardTemplate(),
  };
}
