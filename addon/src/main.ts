/**
 * RevenueSheet — Google Sheets add-on entrypoints.
 * Bundled to dist/Code.js for clasp.
 */
import { BRAND } from "./lib/brand";
import {
  EMAIL_DIGEST_SCOPE,
  type DashboardTemplate,
  type ScheduleCadence,
  type SourceId,
} from "./lib/config";
import { runWeeklyDigest } from "./lib/emailDigest";
import { mapCsvToBundle } from "./importers/csv";
import { checkLicenseSync } from "./lib/license";
import {
  getAllSettingsForSidebar,
  getConnectedSources,
  getCsvColumnMap,
  getDashboardTemplate,
  getDisplayCurrency,
  getLastSyncAt,
  getMrrGoal,
  getStoresBySource,
  setApiKey,
  setCsvColumnMap,
  setDashboardTemplate,
  setDisplayCurrency,
  setEmailDigestOptIn,
  setIncludeTrialingPastDue,
  setLicenseKey,
  setMrrGoal,
  setScheduleCadence,
  setStoresForSource,
} from "./lib/properties";
import { installDigestTrigger, removeDigestTrigger } from "./lib/schedule";
import { countConnectedStores, upsertStoresForSource } from "./lib/stores";
import {
  installSchedule,
  paintEmptyWorkbook,
  removeSchedule,
  runDemoMode,
  runScheduledSync,
  runSync,
} from "./sync";
import { buildDashboard } from "./sheets/dashboard";
import { readOrders, readRefunds, readSubscriptions, writeImportBundle } from "./sheets/dataTabs";

function onOpen(): void {
  SpreadsheetApp.getUi()
    .createMenu(BRAND.name)
    .addItem("Open sidebar", "showSidebar")
    .addItem("Sync now", "menuSync")
    .addItem("Full backfill", "menuBackfill")
    .addItem("Load example data", "menuDemo")
    .addItem("Import CSV…", "menuImportCsv")
    .addSeparator()
    .addItem("Enable scheduled refresh", "menuEnableSchedule")
    .addItem("Disable schedule", "menuDisableSchedule")
    .addItem("Send weekly digest now", "menuSendDigest")
    .addToUi();
  // First open with nothing connected: draw the empty onboarding dashboard.
  try {
    if (!getConnectedSources().length && !getLastSyncAt()) {
      paintEmptyWorkbook();
    }
  } catch {
    /* non-GAS / no active spreadsheet */
  }
}

function onInstall(_e: GoogleAppsScript.Events.AddonOnInstall): void {
  onOpen();
}

function showSidebar(): void {
  const html = HtmlService.createHtmlOutputFromFile("Sidebar")
    .setTitle(BRAND.name)
    .setWidth(340);
  SpreadsheetApp.getUi().showSidebar(html);
}

function onHomepage(): GoogleAppsScript.Card_Service.Card {
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle(BRAND.name).setSubtitle(BRAND.pitch))
    .addSection(
      CardService.newCardSection()
        .addWidget(
          CardService.newTextParagraph().setText(
            "Open the sidebar to connect Lemon Squeezy, Polar, Gumroad, or Stripe (restricted key), set an MRR goal, and pick a dashboard template.",
          ),
        )
        .addWidget(
          CardService.newTextButton()
            .setText("Open sidebar")
            .setOnClickAction(CardService.newAction().setFunctionName("showSidebar")),
        ),
    )
    .build();
}

function onFileScopeGranted(): void {
  onOpen();
}

function menuSync(): void {
  SpreadsheetApp.getActive().toast(runSync({ full: false }).message, BRAND.name, 8);
}

function menuBackfill(): void {
  SpreadsheetApp.getActive().toast(runSync({ full: true }).message, BRAND.name, 8);
}

function menuDemo(): void {
  SpreadsheetApp.getActive().toast(runDemoMode().message, BRAND.name, 8);
}

function menuEnableSchedule(): void {
  SpreadsheetApp.getActive().toast(installSchedule(), BRAND.name, 8);
}

function menuDisableSchedule(): void {
  SpreadsheetApp.getActive().toast(removeSchedule(), BRAND.name, 5);
}

function menuSendDigest(): void {
  SpreadsheetApp.getActive().toast(runWeeklyDigest().message, BRAND.name, 10);
}

function menuImportCsv(): void {
  const ui = SpreadsheetApp.getUi();
  const res = ui.prompt(
    "CSV import",
    "Paste CSV text (header row required). Column map is in sidebar settings.",
    ui.ButtonSet.OK_CANCEL,
  );
  if (res.getSelectedButton() !== ui.Button.OK) return;
  const text = res.getResponseText();
  if (!text || !text.trim()) {
    ui.alert("No CSV text provided.");
    return;
  }
  const result = sidebarImportCsv(text);
  ui.alert(result.message);
}

function sidebarGetSettings(): Record<string, unknown> {
  const license = checkLicenseSync();
  return {
    ...getAllSettingsForSidebar(),
    brandName: BRAND.name,
    pitch: BRAND.pitch,
    emailDigestScope: EMAIL_DIGEST_SCOPE,
    maxStores: license.maxStores,
    maxSources: license.maxSources,
    licenseTier: license.tier,
    storeCount: countConnectedStores(getStoresBySource()),
  };
}

function sidebarSaveSettings(payload: {
  lemonSqueezy?: string;
  polar?: string;
  gumroad?: string;
  stripe?: string;
  /** Multi-store replace payload: per-source list of { id, label, apiKey }. */
  storesBySource?: Partial<
    Record<SourceId, Array<{ id?: string; label?: string; apiKey?: string; clear?: boolean }>>
  >;
  licenseKey?: string;
  currency?: string;
  includeTrialingPastDue?: boolean;
  mrrGoal?: string | number;
  scheduleCadence?: ScheduleCadence;
  emailDigest?: boolean;
  template?: DashboardTemplate;
  csvMapJson?: string;
}): string {
  // License first so maxStores is current when we validate store count.
  if (payload.licenseKey && payload.licenseKey.indexOf("••") !== 0) {
    if (payload.licenseKey === "-" || payload.licenseKey.toLowerCase() === "clear") setLicenseKey("");
    else setLicenseKey(payload.licenseKey);
  }

  const license = checkLicenseSync({ skipCache: true });

  if (payload.storesBySource) {
    for (const source of Object.keys(payload.storesBySource) as SourceId[]) {
      const updates = payload.storesBySource[source] || [];
      const next = upsertStoresForSource(getStoresBySource()[source] || [], updates);
      setStoresForSource(source, next);
    }
  } else {
    const maybeSet = (source: SourceId, value?: string) => {
      if (value == null || value === "" || value.indexOf("••") === 0) return;
      if (value === "-" || value.toLowerCase() === "clear") setApiKey(source, "");
      else setApiKey(source, value);
    };
    maybeSet("lemon_squeezy", payload.lemonSqueezy);
    maybeSet("polar", payload.polar);
    maybeSet("gumroad", payload.gumroad);
    maybeSet("stripe", payload.stripe);
  }

  const storeCount = countConnectedStores(getStoresBySource());
  if (storeCount > license.maxStores) {
    return `Saved, but your plan allows ${license.maxStores} store(s) and you have ${storeCount}. Extra stores will not sync until you upgrade or remove keys.`;
  }

  if (payload.currency) setDisplayCurrency(payload.currency);
  if (typeof payload.includeTrialingPastDue === "boolean") {
    setIncludeTrialingPastDue(payload.includeTrialingPastDue);
  }
  if (payload.mrrGoal != null && payload.mrrGoal !== "") setMrrGoal(Number(payload.mrrGoal));
  if (payload.scheduleCadence) setScheduleCadence(payload.scheduleCadence);
  if (typeof payload.emailDigest === "boolean") {
    setEmailDigestOptIn(payload.emailDigest);
    if (payload.emailDigest) installDigestTrigger();
    else removeDigestTrigger();
  }
  if (payload.template) setDashboardTemplate(payload.template);
  if (payload.csvMapJson) {
    try {
      setCsvColumnMap(JSON.parse(payload.csvMapJson) as Record<string, string>);
    } catch {
      /* ignore */
    }
  }
  return "Saved. Keys stay in your User Properties.";
}

function sidebarSync(full: boolean): { ok: boolean; message: string } {
  return runSync({ full: !!full });
}

function sidebarDemo(): { ok: boolean; message: string } {
  return runDemoMode();
}

function sidebarEnableSchedule(): string {
  return installSchedule();
}

function sidebarDisableSchedule(): string {
  return removeSchedule();
}

function sidebarImportCsv(text: string): { ok: boolean; message: string } {
  try {
    const bundle = mapCsvToBundle(text || "", getCsvColumnMap());
    const ss = SpreadsheetApp.getActive();
    writeImportBundle(ss, bundle, { merge: true, currency: getDisplayCurrency() });
    buildDashboard(ss, readOrders(ss), readSubscriptions(ss), readRefunds(ss), {
      sample: false,
      lastSyncAt: "CSV",
      sourceLabels: ["CSV"],
      scheduleLabel: "MANUAL",
      currency: getDisplayCurrency(),
      template: getDashboardTemplate(),
      mrrGoal: getMrrGoal(),
    });
    return {
      ok: true,
      message: `CSV imported: ${bundle.orders.length} orders, ${bundle.subscriptions.length} subs.`,
    };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}

function sidebarSendDigest(): { ok: boolean; message: string } {
  return runWeeklyDigest();
}

declare const globalThis: typeof global & Record<string, unknown>;
const g =
  typeof globalThis !== "undefined" ? globalThis : (this as unknown as Record<string, unknown>);

g.onOpen = onOpen;
g.onInstall = onInstall;
g.showSidebar = showSidebar;
g.onHomepage = onHomepage;
g.onFileScopeGranted = onFileScopeGranted;
g.menuSync = menuSync;
g.menuBackfill = menuBackfill;
g.menuDemo = menuDemo;
g.menuEnableSchedule = menuEnableSchedule;
g.menuDisableSchedule = menuDisableSchedule;
g.menuSendDigest = menuSendDigest;
g.menuImportCsv = menuImportCsv;
g.sidebarGetSettings = sidebarGetSettings;
g.sidebarSaveSettings = sidebarSaveSettings;
g.sidebarSync = sidebarSync;
g.sidebarDemo = sidebarDemo;
g.sidebarEnableSchedule = sidebarEnableSchedule;
g.sidebarDisableSchedule = sidebarDisableSchedule;
g.sidebarImportCsv = sidebarImportCsv;
g.sidebarSendDigest = sidebarSendDigest;
g.runScheduledSync = runScheduledSync;
g.runWeeklyDigest = runWeeklyDigest;
