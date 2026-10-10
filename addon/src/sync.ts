import { CONFIG, SHEET_NAMES, SOURCES, type SourceId } from "./lib/config";
import { isBackfillIncomplete, resolveFetchCursor } from "./lib/backfill";
import { checkLicenseSync, enforceSourceLimit, type LicenseStatus } from "./lib/license";
import {
  clearSyncCursor,
  getApiKey,
  getConnectedSources,
  getDashboardTemplate,
  getDisplayCurrency,
  getIncludeTrialingPastDue,
  getLastSyncAt,
  getMrrGoal,
  getScheduleCadence,
  getSyncCursor,
  setDemoMode,
  setLastSyncAt,
  setSyncCursor,
} from "./lib/properties";
import { BRAND } from "./lib/brand";
import { COLORS } from "./lib/tokens";
import {
  installSchedule as installScheduleTrigger,
  removeSchedule as removeScheduleTrigger,
} from "./lib/schedule";
import { fetchGumroadResultSync } from "./importers/gumroad";
import { fetchLemonSqueezyResultSync } from "./importers/lemonSqueezy";
import { fetchPolarResultSync } from "./importers/polar";
import { fetchStripeResultSync } from "./importers/stripe";
import type { ImportBundle, ImportResult, SyncCursor } from "./importers/types";
import { buildSampleBundle } from "./demo/sampleData";
import { buildDashboard } from "./sheets/dashboard";
import {
  ensureDataSheets,
  readOrders,
  readRefunds,
  readSubscriptions,
  writeImportBundle,
} from "./sheets/dataTabs";

export interface SyncResult {
  ok: boolean;
  message: string;
  sources: SourceId[];
  sample?: boolean;
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

function fetchSourceResult(source: SourceId, apiKey: string, cursor: SyncCursor): ImportResult {
  switch (source) {
    case "lemon_squeezy":
      return fetchLemonSqueezyResultSync(apiKey, cursor);
    case "polar":
      return fetchPolarResultSync(apiKey, cursor);
    case "gumroad":
      return fetchGumroadResultSync(apiKey, cursor);
    case "stripe":
      return fetchStripeResultSync(apiKey, cursor);
    default:
      return {
        bundle: emptyBundle(),
        cursor: { backfillComplete: true, lastSyncedAt: new Date().toISOString() },
        incomplete: false,
      };
  }
}

function scheduleLabelForUi(): string {
  switch (getScheduleCadence()) {
    case "every_6h":
      return "EVERY 6H";
    case "daily":
      return "DAILY";
    case "weekly":
      return "WEEKLY";
    default:
      return "HOURLY";
  }
}

function dashboardOpts(partial: {
  sample?: boolean;
  lastSyncAt: string;
  sourceLabels: string[];
  scheduleLabel: string;
  studioLabel?: string;
  licenseNote?: string;
  backfillIncomplete?: boolean;
}) {
  return {
    ...partial,
    currency: getDisplayCurrency(),
    includeTrialingPastDue: getIncludeTrialingPastDue(),
    template: getDashboardTemplate(),
    mrrGoal: getMrrGoal(),
  };
}

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

  writeImportBundle(ss, bundle, {
    merge: !opts.full || resuming,
    currency: getDisplayCurrency(),
  });

  const orders = readOrders(ss);
  const subscriptions = readSubscriptions(ss);
  const refunds = readRefunds(ss);
  const now = new Date();
  setLastSyncAt(now.toISOString());
  setDemoMode(false);

  const labels = limited.allowed.map((id) => SOURCES.find((s) => s.id === id)?.label || id);

  buildDashboard(
    ss,
    orders,
    subscriptions,
    refunds,
    dashboardOpts({
      sample: false,
      lastSyncAt: Utilities.formatDate(now, ss.getSpreadsheetTimeZone(), "yyyy-MM-dd HH:mm"),
      sourceLabels: labels,
      scheduleLabel: license.allowSchedule ? scheduleLabelForUi() : "MANUAL",
      licenseNote: license.degraded ? license.message : "",
      backfillIncomplete: incompleteSources.length > 0,
    }),
  );

  ensureSettingsSheet(ss, license);

  const incomplete = incompleteSources.length > 0;
  return {
    ok: errors.length === 0,
    incomplete,
    message: errors.length
      ? `Synced with errors: ${errors.join("; ")}`
      : incomplete
        ? `Synced ${labels.join(", ") || "no sources"} (backfill in progress · will resume on next sync).`
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

  buildDashboard(
    ss,
    bundle.orders,
    bundle.subscriptions,
    bundle.refunds,
    dashboardOpts({
      sample: true,
      lastSyncAt: "2026-10-09 10:02",
      // Sample data only covers LS / Polar / Gumroad — do not list Stripe unless connected.
      sourceLabels: ["Lemon Squeezy", "Polar", "Gumroad"],
      scheduleLabel: "HOURLY",
      studioLabel: "EXAMPLE STUDIO",
    }),
  );

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
  return installScheduleTrigger();
}

export function removeSchedule(): string {
  return removeScheduleTrigger();
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
  ss.getSheetByName(SHEET_NAMES.dashboard)?.setTabColor(COLORS.ink);
  ss.getSheetByName(SHEET_NAMES.orders)?.setTabColor(COLORS.ink);
  ss.getSheetByName(SHEET_NAMES.subscriptions)?.setTabColor(COLORS.ink);
  ss.getSheetByName(SHEET_NAMES.customers)?.setTabColor(COLORS.ink);
  ss.getSheetByName(SHEET_NAMES.refunds)?.setTabColor(COLORS.danger);
  ss.getSheetByName(SHEET_NAMES.settings)?.setTabColor(COLORS.settingsTab);
  ss.getSheetByName(SHEET_NAMES.mrrMonthly)?.setTabColor(COLORS.settingsTab);
  ss.getSheetByName(SHEET_NAMES.cohorts)?.setTabColor(COLORS.settingsTab);
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
    ["Schedule cadence", getScheduleCadence()],
    ["Dashboard template", getDashboardTemplate()],
    ["MRR goal", getMrrGoal() || "—"],
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
