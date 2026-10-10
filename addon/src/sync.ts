import { CONFIG, SHEET_NAMES, SOURCES, type SourceId } from "./lib/config";
import { isBackfillIncomplete, resolveFetchCursor } from "./lib/backfill";
import { checkLicenseSync, enforceSourceLimit, type LicenseStatus } from "./lib/license";
import {
  clearSyncCursor,
  getApiKey,
  getConnectedSources,
  getDisplayCurrency,
  getIncludeTrialingPastDue,
  getLastSyncAt,
  getSyncCursor,
  setDemoMode,
  setLastSyncAt,
  setSyncCursor,
} from "./lib/properties";
import { BRAND } from "./lib/brand";
import { COLORS } from "./lib/tokens";
import { fetchGumroadResultSync } from "./importers/gumroad";
import { fetchLemonSqueezyResultSync } from "./importers/lemonSqueezy";
import { fetchPolarResultSync } from "./importers/polar";
import type { ImportBundle, ImportResult, SyncCursor } from "./importers/types";
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
  /** True when at least one source still has pages left (resume on next run). */
  incomplete?: boolean;
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

function fetchSourceResult(
  source: SourceId,
  apiKey: string,
  cursor: SyncCursor,
): ImportResult {
  switch (source) {
    case "lemon_squeezy":
      return fetchLemonSqueezyResultSync(apiKey, cursor);
    case "polar":
      return fetchPolarResultSync(apiKey, cursor);
    case "gumroad":
      return fetchGumroadResultSync(apiKey, cursor);
    default:
      return {
        bundle: emptyBundle(),
        cursor: { backfillComplete: true, lastSyncedAt: new Date().toISOString() },
        incomplete: false,
      };
  }
}

/** Full backfill (full=true) or incremental sync. Incomplete backfills resume from saved cursors. */
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
  const incompleteSources: SourceId[] = [];
  let resuming = false;

  for (const source of limited.allowed as SourceId[]) {
    const key = getApiKey(source);
    if (!key) continue;
    try {
      const stored = getSyncCursor(source);
      if (isBackfillIncomplete(stored)) resuming = true;
      const { cursor } = resolveFetchCursor(stored, !!opts.full);
      const result = fetchSourceResult(source, key, cursor);
      bundle = mergeBundles(bundle, result.bundle);
      setSyncCursor(source, result.cursor);
      if (result.incomplete) incompleteSources.push(source);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${source}: ${msg}`);
    }
  }

  // Fresh full backfill clears on the first chunk; resumed chunks merge.
  writeImportBundle(ss, bundle, {
    merge: !opts.full || resuming,
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
    includeTrialingPastDue: getIncludeTrialingPastDue(),
    backfillIncomplete: incompleteSources.length > 0,
  });

  ensureSettingsSheet(ss, license);

  const incomplete = incompleteSources.length > 0;
  return {
    ok: errors.length === 0,
    incomplete,
    message: errors.length
      ? `Synced with errors: ${errors.join("; ")}`
      : incomplete
        ? `Synced ${labels.join(", ") || "no sources"} (backfill in progress — will resume on next sync).`
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
    includeTrialingPastDue: getIncludeTrialingPastDue(),
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
  // Prefer finishing incomplete backfills; otherwise incremental.
  runSync({ full: false });
}

function colorDataTabs(ss: GoogleAppsScript.Spreadsheet.Spreadsheet): void {
  ss.getSheetByName(SHEET_NAMES.dashboard)?.setTabColor(COLORS.ink);
  ss.getSheetByName(SHEET_NAMES.orders)?.setTabColor(COLORS.ink);
  ss.getSheetByName(SHEET_NAMES.subscriptions)?.setTabColor(COLORS.ink);
  ss.getSheetByName(SHEET_NAMES.customers)?.setTabColor(COLORS.ink);
  ss.getSheetByName(SHEET_NAMES.refunds)?.setTabColor(COLORS.danger);
  ss.getSheetByName(SHEET_NAMES.settings)?.setTabColor(COLORS.settingsTab);
  ss.getSheetByName(SHEET_NAMES.mrrMonthly)?.setTabColor(COLORS.settingsTab);
}

function ensureSettingsSheet(
  ss: GoogleAppsScript.Spreadsheet.Spreadsheet,
  license: LicenseStatus,
): void {
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
    ["MRR includes trial/past_due", getIncludeTrialingPastDue() ? "yes" : "no (default)"],
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
