import { CONFIG, SHEET_NAMES, SOURCES, type SourceId } from "./lib/config";
import { isBackfillIncomplete, resolveFetchCursor } from "./lib/backfill";
import { checkLicenseSync, enforceSourceLimit, type LicenseStatus } from "./lib/license";
import type { BackfillSourceRow } from "./lib/onboardingCopy";
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
import { computeMrr } from "./metrics/mrr";
import { buildDashboard } from "./sheets/dashboard";
import {
  ensureDataSheets,
  readOrders,
  readRefunds,
  readSubscriptions,
  writeImportBundle,
} from "./sheets/dataTabs";
import { writeEmptyCohortSheet } from "./sheets/growthPanels";
import { applyTabOrderAndColors, ensureAllTabs } from "./sheets/tabs";

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

/** First open / no keys: paint empty dashboard + cohorts + settings. */
export function paintEmptyWorkbook(ss?: GoogleAppsScript.Spreadsheet.Spreadsheet): void {
  const spreadsheet = ss || SpreadsheetApp.getActive();
  ensureAllTabs(spreadsheet);
  ensureDataSheets(spreadsheet);
  applyTabOrderAndColors(spreadsheet);
  const license = checkLicenseSync();
  buildDashboard(spreadsheet, [], [], [], {
    mode: "empty",
    currency: getDisplayCurrency(),
    studioLabel: "YOUR STORE",
    lastSyncAt: "",
    sourceLabels: [],
    scheduleLabel: "MANUAL",
  });
  writeEmptyCohortSheet(spreadsheet);
  ensureSettingsSheet(spreadsheet, license, { empty: true });
}

export function runSync(opts: { full?: boolean } = {}): SyncResult {
  const ss = SpreadsheetApp.getActive();
  ensureAllTabs(ss);
  ensureDataSheets(ss);
  applyTabOrderAndColors(ss);

  const license = checkLicenseSync();
  const connected = getConnectedSources();
  if (!connected.length) {
    paintEmptyWorkbook(ss);
    return {
      ok: false,
      message: `No API keys saved. Open ${BRAND.name} → sidebar to connect a source.`,
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
  const completedThisRun: SourceId[] = [];
  const totalKnownBySource: Partial<Record<SourceId, number>> = {};
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
      if (result.totalCount != null && result.totalCount > 0) {
        totalKnownBySource[source] = result.totalCount;
      }
      if (result.incomplete) incompleteSources.push(source);
      else completedThisRun.push(source);
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
  const incomplete = incompleteSources.length > 0;
  const syncTime = Utilities.formatDate(now, ss.getSpreadsheetTimeZone(), "HH:mm");
  const fullSyncTime = Utilities.formatDate(now, ss.getSpreadsheetTimeZone(), "yyyy-MM-dd HH:mm");

  if (incomplete) {
    const activeId = incompleteSources[0];
    const activeLabel = SOURCES.find((s) => s.id === activeId)?.label || activeId;
    const ordersSoFar = orders.filter((o) => o.source === activeId).length || orders.length;
    const mrr = computeMrr(subscriptions, { includeTrialingPastDue: getIncludeTrialingPastDue() });
    const net30 = sumNetRevenue30d(orders, refunds);
    buildDashboard(ss, orders, subscriptions, refunds, {
      ...dashboardOpts({
        sample: false,
        lastSyncAt: syncTime,
        sourceLabels: labels,
        scheduleLabel: license.allowSchedule ? scheduleLabelForUi() : "MANUAL",
        licenseNote: license.degraded ? license.message : "",
        backfillIncomplete: true,
      }),
      mode: "syncing",
      syncing: {
        activeLabel,
        ordersSoFar,
        totalKnown: totalKnownBySource[activeId],
        doneLabels: completedThisRun
          .filter((id) => !incompleteSources.includes(id))
          .map((id) => SOURCES.find((s) => s.id === id)?.label || id),
        sources: buildBackfillRows(orders, limited.allowed as SourceId[], incompleteSources, totalKnownBySource),
        partial: {
          mrr: mrr.total,
          net30,
          activeSubs: mrr.activeCount,
        },
      },
    });
    writeEmptyCohortSheet(ss);
  } else {
    buildDashboard(
      ss,
      orders,
      subscriptions,
      refunds,
      dashboardOpts({
        sample: false,
        lastSyncAt: fullSyncTime,
        sourceLabels: labels,
        scheduleLabel: license.allowSchedule ? scheduleLabelForUi() : "MANUAL",
        licenseNote: license.degraded ? license.message : "",
        backfillIncomplete: false,
      }),
    );
  }

  ensureSettingsSheet(ss, license);

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

function sumNetRevenue30d(
  orders: { created: string; amount: number; status?: string }[],
  refunds: { created: string; amount: number }[],
): number {
  const end = Date.now();
  const start = end - 30 * 86400000;
  let sum = 0;
  for (const o of orders) {
    const t = Date.parse(o.created);
    if (Number.isNaN(t) || t < start || t > end) continue;
    const status = String(o.status || "").toLowerCase();
    if (status === "refunded" || status === "chargeback" || status === "failed") continue;
    sum += Number(o.amount) || 0;
  }
  for (const r of refunds) {
    const t = Date.parse(r.created);
    if (Number.isNaN(t) || t < start || t > end) continue;
    sum -= Number(r.amount) || 0;
  }
  return Math.round(sum * 100) / 100;
}

function buildBackfillRows(
  orders: { source: string }[],
  connected: SourceId[],
  incomplete: SourceId[],
  totals: Partial<Record<SourceId, number>>,
): BackfillSourceRow[] {
  const countBy = (id: string) => orders.filter((o) => o.source === id).length;
  const connectedSet = new Set(connected);
  const incompleteSet = new Set(incomplete);
  const rows: BackfillSourceRow[] = SOURCES.map((s) => {
    const rowsN = countBy(s.id);
    if (!connectedSet.has(s.id)) {
      return { label: s.label, rows: 0, status: "not_connected" };
    }
    if (incompleteSet.has(s.id)) {
      return {
        label: s.label,
        rows: rowsN,
        totalKnown: totals[s.id],
        status: "backfilling",
      };
    }
    return { label: s.label, rows: rowsN, status: "synced" };
  });
  const csvRows = countBy("csv");
  rows.push({
    label: "CSV",
    rows: csvRows,
    status: csvRows > 0 ? "synced" : "not_imported",
  });
  return rows;
}

export function runDemoMode(): SyncResult {
  const ss = SpreadsheetApp.getActive();
  ensureAllTabs(ss);
  ensureDataSheets(ss);
  applyTabOrderAndColors(ss);
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

function ensureSettingsSheet(
  ss: GoogleAppsScript.Spreadsheet.Spreadsheet,
  license: LicenseStatus,
  opts: { empty?: boolean } = {},
): void {
  let sheet = ss.getSheetByName(SHEET_NAMES.settings);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAMES.settings);
  sheet.clear();
  sheet.setTabColor(COLORS.settingsTab);
  const connected = getConnectedSources();
  const lastSync = opts.empty
    ? "Never"
    : getLastSyncAt() || "Never";
  const schedule = opts.empty || !license.allowSchedule
    ? "Off · turn on in the sidebar"
    : getScheduleCadence();
  const sources = opts.empty || !connected.length
    ? "None connected"
    : connected.map((id) => SOURCES.find((s) => s.id === id)?.label || id).join(", ");
  const plan = license.tier === "free" || opts.empty
    ? "Free until a license key is saved"
    : `${license.tier} · ${license.message}`;
  const rows: unknown[][] = [
    ["Setting", "Value"],
    ["Last sync", lastSync],
    ["Schedule", schedule],
    ["Sources", sources],
    ["Plan", plan],
    ["License tier", license.tier],
    ["License status", license.message],
    ["Schedule allowed", license.allowSchedule ? "yes" : "no"],
    ["Schedule cadence", getScheduleCadence()],
    ["Dashboard template", getDashboardTemplate()],
    ["MRR goal", getMrrGoal() || "·"],
    ["Currency", getDisplayCurrency()],
    ["MRR includes trial/past_due", getIncludeTrialingPastDue() ? "yes" : "no (default)"],
    ["Connected sources", connected.join(", ") || "·"],
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
