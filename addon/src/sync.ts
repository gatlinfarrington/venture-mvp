import { CONFIG, SHEET_NAMES, SOURCES, type SourceId } from "./lib/config";
import { checkLicenseSync, enforceSourceLimit, type LicenseStatus } from "./lib/license";
import {
  clearSyncCursor,
  getApiKey,
  getConnectedSources,
  getDisplayCurrency,
  getLastSyncAt,
  getSyncCursor,
  setDemoMode,
  setLastSyncAt,
  setSyncCursor,
} from "./lib/properties";
import { BRAND } from "./lib/brand";
import { COLORS } from "./lib/tokens";
import { fetchGumroadSync } from "./importers/gumroad";
import { fetchLemonSqueezySync } from "./importers/lemonSqueezy";
import { fetchPolarSync } from "./importers/polar";
import type { ImportBundle, SyncCursor } from "./importers/types";
import { buildSampleBundle } from "./demo/sampleData";
import { buildDashboard } from "./sheets/dashboard";
import {
  ensureDataSheets,
  readOrders,
  readSubscriptions,
  writeImportBundle,
} from "./sheets/dataTabs";

export interface SyncResult {
  ok: boolean;
  message: string;
  sources: SourceId[];
  sample?: boolean;
}

function emptyBundle(): ImportBundle {
  return { orders: [], subscriptions: [], customers: [], refunds: [] };
}

function mergeBundles(a: ImportBundle, b: ImportBundle): ImportBundle {
  return {
    orders: [...a.orders, ...b.orders],
    subscriptions: [...a.subscriptions, ...b.subscriptions],
    customers: [...a.customers, ...b.customers],
    refunds: [...a.refunds, ...b.refunds],
  };
}

function fetchSourceSync(source: SourceId, apiKey: string, cursor: SyncCursor | undefined, full: boolean): ImportBundle {
  const c = full ? undefined : cursor;
  switch (source) {
    case "lemon_squeezy":
      return fetchLemonSqueezySync(apiKey, c);
    case "polar":
      return fetchPolarSync(apiKey, c);
    case "gumroad":
      return fetchGumroadSync(apiKey, c);
    default:
      return emptyBundle();
  }
}

/** Full backfill (full=true) or incremental sync from stored cursors. */
export function runSync(opts: { full?: boolean } = {}): SyncResult {
  const ss = SpreadsheetApp.getActive();
  ensureDataSheets(ss);
  colorDataTabs(ss);

  const license = checkLicenseSync();
  const connected = getConnectedSources();
  if (!connected.length) {
    return {
      ok: false,
      message: `No API keys saved. Open ${BRAND.name} → Settings to connect a source.`,
      sources: [],
    };
  }

  const limited = enforceSourceLimit(license, connected);
  if (limited.blocked.length) {
    SpreadsheetApp.getActive().toast(limited.message || "Source limit reached", BRAND.name, 8);
  }

  let bundle = emptyBundle();
  const errors: string[] = [];

  for (const source of limited.allowed as SourceId[]) {
    const key = getApiKey(source);
    if (!key) continue;
    try {
      const cursor = getSyncCursor(source);
      const part = fetchSourceSync(source, key, cursor, !!opts.full);
      bundle = mergeBundles(bundle, part);
      setSyncCursor(source, { lastSyncedAt: new Date().toISOString() });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${source}: ${msg}`);
    }
  }

  writeImportBundle(ss, bundle, {
    merge: !opts.full,
    currency: getDisplayCurrency(),
  });

  const orders = readOrders(ss);
  const subscriptions = readSubscriptions(ss);
  const now = new Date();
  setLastSyncAt(now.toISOString());
  setDemoMode(false);

  const labels = limited.allowed.map((id) => SOURCES.find((s) => s.id === id)?.label || id);

  buildDashboard(ss, orders, subscriptions, bundle.refunds, {
    sample: false,
    lastSyncAt: Utilities.formatDate(now, ss.getSpreadsheetTimeZone(), "HH:mm"),
    sourceLabels: labels,
    scheduleLabel: license.allowSchedule ? "HOURLY" : "MANUAL",
    currency: getDisplayCurrency(),
    licenseNote: license.degraded ? license.message : "",
    stale: false,
  });

  ensureSettingsSheet(ss, license);

  return {
    ok: errors.length === 0,
    message: errors.length
      ? `Synced with errors: ${errors.join("; ")}`
      : `Synced ${labels.join(", ") || "no sources"}.`,
    sources: limited.allowed as SourceId[],
  };
}

export function runDemoMode(): SyncResult {
  const ss = SpreadsheetApp.getActive();
  ensureDataSheets(ss);
  colorDataTabs(ss);
  const bundle = buildSampleBundle();
  writeImportBundle(ss, bundle, { merge: false, currency: "USD" });
  setDemoMode(true);
  setLastSyncAt(new Date().toISOString());

  buildDashboard(ss, bundle.orders, bundle.subscriptions, bundle.refunds, {
    sample: true,
    lastSyncAt: "10:02",
    sourceLabels: ["Lemon Squeezy", "Polar", "Gumroad"],
    scheduleLabel: "HOURLY",
    studioLabel: "EXAMPLE STUDIO",
    currency: "USD",
  });

  ensureSettingsSheet(ss, {
    tier: "free",
    ok: true,
    degraded: false,
    message: "Demo mode",
    maxSources: CONFIG.FREE_MAX_SOURCES,
    allowSchedule: false,
  });

  return {
    ok: true,
    message: "Loaded EXAMPLE DATA (sample). Not real customers.",
    sources: ["lemon_squeezy", "polar", "gumroad"],
    sample: true,
  };
}

export function installSchedule(): string {
  const license = checkLicenseSync();
  if (!license.allowSchedule) {
    return "Scheduled refresh requires a paid plan. Connect a license key in Settings.";
  }
  removeScheduleTriggers_();
  ScriptApp.newTrigger(CONFIG.SYNC_TRIGGER_HANDLER).timeBased().everyHours(1).create();
  return "Hourly refresh scheduled.";
}

export function removeSchedule(): string {
  removeScheduleTriggers_();
  return "Scheduled refresh removed.";
}

function removeScheduleTriggers_(): void {
  for (const t of ScriptApp.getProjectTriggers()) {
    if (t.getHandlerFunction() === CONFIG.SYNC_TRIGGER_HANDLER) ScriptApp.deleteTrigger(t);
  }
}

export function runScheduledSync(): void {
  const license = checkLicenseSync();
  if (!license.allowSchedule) {
    console.warn("Scheduled sync skipped — license does not allow schedule.");
    return;
  }
  runSync({ full: false });
}

function colorDataTabs(ss: GoogleAppsScript.Spreadsheet.Spreadsheet): void {
  ss.getSheetByName(SHEET_NAMES.orders)?.setTabColor(COLORS.ink);
  ss.getSheetByName(SHEET_NAMES.subscriptions)?.setTabColor(COLORS.ink);
  ss.getSheetByName(SHEET_NAMES.customers)?.setTabColor(COLORS.ink);
  ss.getSheetByName(SHEET_NAMES.refunds)?.setTabColor(COLORS.danger);
  ss.getSheetByName(SHEET_NAMES.settings)?.setTabColor(COLORS.settingsTab);
}

function ensureSettingsSheet(ss: GoogleAppsScript.Spreadsheet.Spreadsheet, license: LicenseStatus): void {
  let sheet = ss.getSheetByName(SHEET_NAMES.settings);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAMES.settings);
  sheet.clear();
  sheet.setTabColor(COLORS.settingsTab);
  const rows: unknown[][] = [
    ["Setting", "Value"],
    ["Last sync", getLastSyncAt() || "—"],
    ["License tier", license.tier],
    ["License status", license.message],
    ["Schedule allowed", license.allowSchedule ? "yes" : "no"],
    ["Currency", getDisplayCurrency()],
    ["Connected sources", getConnectedSources().join(", ") || "—"],
    ["License API", "Script property LICENSE_API_BASE (optional override)"],
    ["Brand", BRAND.name],
  ];
  sheet.getRange(1, 1, rows.length, 2).setValues(rows);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, 2).setFontWeight("bold").setBackground(COLORS.surface2);
}

export function resetSourceCursor(source: SourceId): void {
  clearSyncCursor(source);
}
