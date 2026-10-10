import { SOURCES, type SourceId } from "./config";

const LICENSE_KEY_PROP = "LICENSE_KEY";
const CURRENCY_PROP = "DISPLAY_CURRENCY";
const CURSOR_PREFIX = "SYNC_CURSOR_";
const LAST_SYNC_PROP = "LAST_SYNC_AT";
const DEMO_MODE_PROP = "DEMO_MODE";
const INCLUDE_TRIAL_PAST_DUE_PROP = "MRR_INCLUDE_TRIAL_PAST_DUE";

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

/** When true, trialing + past_due count toward headline MRR (default false). */
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

export function getAllSettingsForSidebar(): {
  lemonSqueezy: string;
  polar: string;
  gumroad: string;
  licenseKey: string;
  currency: string;
  lastSyncAt: string;
  demoMode: boolean;
  includeTrialingPastDue: boolean;
} {
  return {
    lemonSqueezy: getApiKey("lemon_squeezy") ? "••••••••" : "",
    polar: getApiKey("polar") ? "••••••••" : "",
    gumroad: getApiKey("gumroad") ? "••••••••" : "",
    licenseKey: getLicenseKey() ? "••••••••" : "",
    currency: getDisplayCurrency(),
    lastSyncAt: getLastSyncAt(),
    demoMode: isDemoMode(),
    includeTrialingPastDue: getIncludeTrialingPastDue(),
  };
}
