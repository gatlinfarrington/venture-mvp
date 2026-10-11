/**
 * RevenueSheet — Google Sheets add-on entrypoints.
 * Bundled to dist/Code.js for clasp.
 *
 * Workspace add-on rule: never call SpreadsheetApp until `drive.file` is granted
 * for the active spreadsheet (homepage card → requestFileScopeForActiveDocument).
 */
import { BRAND } from "./lib/brand";
import { continueSyncInBackground, getBgStatus, startCardSync } from "./background";
import {
  EMAIL_DIGEST_SCOPE,
  EMAIL_DIGEST_SCOPE_DECLARED,
  SOURCES,
  type DashboardTemplate,
  type ScheduleCadence,
  type SourceId,
} from "./lib/config";
import { runWeeklyDigest } from "./lib/emailDigest";
import {
  canAccessActiveSpreadsheet,
  hasFileScopePermission,
  type SheetsAddonEvent,
} from "./lib/fileScope";
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
import {
  installDigestTrigger,
  isScheduleEnabled,
  removeDigestTrigger,
} from "./lib/schedule";
import { countConnectedStores, upsertStoresForSource } from "./lib/stores";
import {
  getPricingUrl,
  getSiteBaseUrl,
  multiStoreUpgradeBody,
  multiStoreUpgradeHeadline,
  withPricingCta,
} from "./lib/upgrade";
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

/** Card: ask for per-file `drive.file` — no SpreadsheetApp. */
function requestFileScopeCard(): GoogleAppsScript.Card_Service.Card {
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle(BRAND.name).setSubtitle(BRAND.pitch))
    .addSection(
      CardService.newCardSection()
        .addWidget(
          CardService.newTextParagraph().setText(
            "Allow access to this spreadsheet so RevenueSheet can sync revenue and build your dashboard. We only access files you open with the add-on.",
          ),
        )
        .addWidget(
          CardService.newTextButton()
            .setText("Allow access to this spreadsheet")
            .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
            .setOnClickAction(CardService.newAction().setFunctionName("onRequestFileScope")),
        ),
    )
    .build();
}

/** Native card UI. Card actions run as the Google account that opened the Sheet,
 * so they work even when several Google accounts are signed in (the HTML sidebar's
 * google.script.run calls can silently hang in that case). */
function readyHomepageCard(notice?: string): GoogleAppsScript.Card_Service.Card {
  let settings: Record<string, unknown> = {};
  try {
    settings = getAllSettingsForSidebar();
  } catch {
    /* properties unavailable: render empty form */
  }
  const masked = (v: unknown) => (v ? "Saved (leave blank to keep)" : "");
  const input = (name: string, title: string, hint: string, value = "") =>
    CardService.newTextInput().setFieldName(name).setTitle(title).setHint(hint).setValue(value);
  const bg = getBgStatus();
  const lastSync =
    bg?.state === "running"
      ? bg.needsManualContinue
        ? `${bg.records} records so far. Click Continue sync to fetch the rest.`
        : `Syncing in background… ${bg.records} records so far.`
      : bg?.state === "error"
        ? bg.message
        : settings.lastSyncAt
          ? `Last sync: ${String(settings.lastSyncAt)}`
          : "Not synced yet.";

  const card = CardService.newCardBuilder().setHeader(
    CardService.newCardHeader().setTitle(BRAND.name).setSubtitle(BRAND.pitch),
  );
  if (notice) {
    card.addSection(CardService.newCardSection().addWidget(CardService.newTextParagraph().setText(notice)));
  }
  card.addSection(
    CardService.newCardSection()
      .setHeader("Connect")
      .addWidget(input("licenseKey", "License key", masked(settings.licenseKey) || "From your purchase email"))
      .addWidget(input("lemonSqueezy", "Lemon Squeezy API key", masked(settings.lemonSqueezy)))
      .addWidget(input("polar", "Polar access token", masked(settings.polar)))
      .addWidget(input("gumroad", "Gumroad access token", masked(settings.gumroad)))
      .addWidget(input("stripe", "Stripe restricted key (rk_...)", masked(settings.stripe)))
      .addWidget(input("currency", "Display currency", "e.g. USD", String(settings.currency || "USD")))
      .addWidget(input("mrrGoal", "MRR goal (optional)", "e.g. 5000", String(settings.mrrGoal || "")))
      .addWidget(
        CardService.newTextButton()
          .setText("Save")
          .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
          .setOnClickAction(CardService.newAction().setFunctionName("cardSave")),
      ),
  );
  card.addSection(
    CardService.newCardSection()
      .setHeader("Sync")
      .addWidget(CardService.newTextParagraph().setText(lastSync))
      .addWidget(
        CardService.newButtonSet()
          .addButton(
            CardService.newTextButton()
              .setText("Sync now")
              .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
              .setOnClickAction(CardService.newAction().setFunctionName("cardSync")),
          )
          .addButton(
            CardService.newTextButton()
              .setText(bg?.state === "running" ? "Continue sync" : "Refresh")
              .setOnClickAction(
                CardService.newAction().setFunctionName(bg?.state === "running" ? "cardSync" : "cardRefresh"),
              ),
          )
          .addButton(
            CardService.newTextButton()
              .setText("Load demo data")
              .setOnClickAction(CardService.newAction().setFunctionName("cardDemo")),
          ),
      )
      .addWidget(
        CardService.newTextButton()
          .setText("Advanced settings (sidebar)")
          .setOnClickAction(CardService.newAction().setFunctionName("showSidebar")),
      ),
  );
  return card.build();
}

function errText(err: unknown): string {
  const m = err instanceof Error ? err.message : String(err);
  return m || "Unknown error";
}

function cardResponse(message: string): GoogleAppsScript.Card_Service.ActionResponse {
  let card: GoogleAppsScript.Card_Service.Card;
  try {
    card = readyHomepageCard(message);
  } catch {
    card = CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader().setTitle(BRAND.name))
      .addSection(CardService.newCardSection().addWidget(CardService.newTextParagraph().setText(message)))
      .build();
  }
  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification().setText(message.slice(0, 250)))
    .setNavigation(CardService.newNavigation().updateCard(card))
    .build();
}

type CardEvent = { formInput?: Record<string, string>; commonEventObject?: { formInputs?: Record<string, { stringInputs?: { value?: string[] } }> } };

function formValue(e: CardEvent, name: string): string {
  const v = e?.commonEventObject?.formInputs?.[name]?.stringInputs?.value?.[0] ?? e?.formInput?.[name] ?? "";
  return String(v).trim();
}

function cardSave(e: CardEvent): GoogleAppsScript.Card_Service.ActionResponse {
  try {
    const msg = sidebarSaveSettings({
      licenseKey: formValue(e, "licenseKey"),
      lemonSqueezy: formValue(e, "lemonSqueezy"),
      polar: formValue(e, "polar"),
      gumroad: formValue(e, "gumroad"),
      stripe: formValue(e, "stripe"),
      currency: formValue(e, "currency") || undefined,
      mrrGoal: formValue(e, "mrrGoal"),
    });
    return cardResponse(msg);
  } catch (err) {
    console.error("cardSave failed", err);
    return cardResponse(`Couldn't save: ${errText(err)}`);
  }
}

function cardSync(e: CardEvent): GoogleAppsScript.Card_Service.ActionResponse {
  try {
    // Save anything typed into the form first so "Save" isn't a required extra click.
    const typed = ["licenseKey", "lemonSqueezy", "polar", "gumroad", "stripe"].some((n) => formValue(e, n));
    if (typed) cardSave(e);
    if (!canAccessActiveSpreadsheet()) {
      return cardResponse("Allow access to this spreadsheet from the RevenueSheet card first.");
    }
    const r = startCardSync(false);
    return cardResponse(r.message);
  } catch (err) {
    console.error("cardSync failed", err);
    return cardResponse(`Sync failed: ${errText(err)}`);
  }
}

function cardRefresh(): GoogleAppsScript.Card_Service.ActionResponse {
  const bg = getBgStatus();
  return cardResponse(bg?.message || "Up to date.");
}

function cardDemo(): GoogleAppsScript.Card_Service.ActionResponse {
  try {
    return cardResponse(sidebarDemo().message);
  } catch (err) {
    console.error("cardDemo failed", err);
    return cardResponse(`Demo failed: ${errText(err)}`);
  }
}

/**
 * Homepage trigger. Must not touch SpreadsheetApp before file scope is granted.
 */
function onHomepage(e?: SheetsAddonEvent): GoogleAppsScript.Card_Service.Card {
  if (!hasFileScopePermission(e)) return requestFileScopeCard();
  return readyHomepageCard();
}

/** Button callback → per-file drive.file dialog for the active spreadsheet. */
function onRequestFileScope(): GoogleAppsScript.Card_Service.EditorFileScopeActionResponse {
  return CardService.newEditorFileScopeActionResponseBuilder()
    .requestFileScopeForActiveDocument()
    .build();
}

/** Runs after the user grants drive.file for this spreadsheet. */
function onFileScopeGranted(_e?: SheetsAddonEvent): GoogleAppsScript.Card_Service.Card[] {
  tryInstallEditorUi();
  return [readyHomepageCard()];
}

/** Install menu + empty onboarding only when SpreadsheetApp is allowed. */
function tryInstallEditorUi(): void {
  if (!canAccessActiveSpreadsheet()) return;
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
  try {
    if (!getConnectedSources().length && !getLastSyncAt()) {
      paintEmptyWorkbook();
    }
  } catch {
    /* paint best-effort */
  }
}

function onOpen(): void {
  tryInstallEditorUi();
}

function onInstall(_e: GoogleAppsScript.Events.AddonOnInstall): void {
  onOpen();
}

function showSidebar(): void {
  if (!canAccessActiveSpreadsheet()) return;
  const html = HtmlService.createHtmlOutputFromFile("Sidebar")
    .setTitle(BRAND.name)
    .setWidth(340);
  SpreadsheetApp.getUi().showSidebar(html);
}

function requireSheetAccess(): boolean {
  if (canAccessActiveSpreadsheet()) return true;
  try {
    SpreadsheetApp.getUi().alert(
      BRAND.name,
      "Allow access to this spreadsheet from the RevenueSheet sidebar card first (Allow access to this spreadsheet).",
      SpreadsheetApp.getUi().ButtonSet.OK,
    );
  } catch {
    /* no UI without file scope */
  }
  return false;
}

function menuSync(): void {
  if (!requireSheetAccess()) return;
  SpreadsheetApp.getActive().toast(runSync({ full: false }).message, BRAND.name, 8);
}

function menuBackfill(): void {
  if (!requireSheetAccess()) return;
  SpreadsheetApp.getActive().toast(runSync({ full: true }).message, BRAND.name, 8);
}

function menuDemo(): void {
  if (!requireSheetAccess()) return;
  SpreadsheetApp.getActive().toast(runDemoMode().message, BRAND.name, 8);
}

function menuEnableSchedule(): void {
  if (!requireSheetAccess()) return;
  SpreadsheetApp.getActive().toast(installSchedule(), BRAND.name, 8);
}

function menuDisableSchedule(): void {
  if (!requireSheetAccess()) return;
  SpreadsheetApp.getActive().toast(removeSchedule(), BRAND.name, 5);
}

function menuSendDigest(): void {
  if (!requireSheetAccess()) return;
  SpreadsheetApp.getActive().toast(runWeeklyDigest().message, BRAND.name, 10);
}

function menuImportCsv(): void {
  if (!requireSheetAccess()) return;
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
    // Only expose digest when the sensitive scope is actually declared.
    emailDigestAvailable: EMAIL_DIGEST_SCOPE_DECLARED,
    ...(EMAIL_DIGEST_SCOPE_DECLARED
      ? { emailDigestScope: EMAIL_DIGEST_SCOPE }
      : {}),
    maxStores: license.maxStores,
    maxSources: license.maxSources,
    licenseTier: license.tier,
    storeCount: countConnectedStores(getStoresBySource()),
    siteUrl: getSiteBaseUrl(),
    pricingUrl: getPricingUrl(),
    multiStoreUpgradeHeadline: multiStoreUpgradeHeadline(),
    multiStoreUpgradeBody: multiStoreUpgradeBody(),
    scheduleEnabled: isScheduleEnabled(),
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
  /** When set, install or remove the time-driven sync trigger (cadence preserved either way). */
  scheduleEnabled?: boolean;
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

  const storesAfter = getStoresBySource();
  const overSources = SOURCES.filter(
    (meta) => (storesAfter[meta.id] || []).filter((s) => s.apiKey?.trim()).length > license.maxStores,
  );
  if (overSources.length) {
    return withPricingCta(
      `Saved more than ${license.maxStores} store(s) on ${overSources.map((s) => s.label).join(", ")}. Extra stores on those sources will not sync until you remove keys or upgrade`,
    );
  }

  if (payload.currency) setDisplayCurrency(payload.currency);
  if (typeof payload.includeTrialingPastDue === "boolean") {
    setIncludeTrialingPastDue(payload.includeTrialingPastDue);
  }
  if (payload.mrrGoal != null && payload.mrrGoal !== "") setMrrGoal(Number(payload.mrrGoal));
  if (payload.scheduleCadence) setScheduleCadence(payload.scheduleCadence);
  if (typeof payload.scheduleEnabled === "boolean") {
    if (payload.scheduleEnabled) installSchedule(payload.scheduleCadence);
    else removeSchedule();
  }
  // Digest only when the sensitive send_mail scope is declared in the manifest.
  if (EMAIL_DIGEST_SCOPE_DECLARED && typeof payload.emailDigest === "boolean") {
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
  if (!canAccessActiveSpreadsheet()) {
    return { ok: false, message: "Allow access to this spreadsheet from the RevenueSheet card first." };
  }
  return startCardSync(!!full);
}

function sidebarDemo(): { ok: boolean; message: string } {
  if (!canAccessActiveSpreadsheet()) {
    return { ok: false, message: "Allow access to this spreadsheet from the RevenueSheet card first." };
  }
  return runDemoMode();
}

function sidebarEnableSchedule(): string {
  if (!canAccessActiveSpreadsheet()) {
    return "Allow access to this spreadsheet from the RevenueSheet card first.";
  }
  return installSchedule();
}

function sidebarDisableSchedule(): string {
  return removeSchedule();
}

function sidebarImportCsv(text: string): { ok: boolean; message: string } {
  if (!canAccessActiveSpreadsheet()) {
    return { ok: false, message: "Allow access to this spreadsheet from the RevenueSheet card first." };
  }
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
  if (!canAccessActiveSpreadsheet()) {
    return { ok: false, message: "Allow access to this spreadsheet from the RevenueSheet card first." };
  }
  return runWeeklyDigest();
}

/** Time-driven sync — skip quietly if this execution cannot open a spreadsheet. */
function gatedRunScheduledSync(): void {
  if (!canAccessActiveSpreadsheet()) {
    console.warn("Scheduled sync skipped — no file scope for active spreadsheet.");
    return;
  }
  runScheduledSync();
}

declare const globalThis: typeof global & Record<string, unknown>;
const g =
  typeof globalThis !== "undefined" ? globalThis : (this as unknown as Record<string, unknown>);

g.onOpen = onOpen;
g.onInstall = onInstall;
g.showSidebar = showSidebar;
g.onHomepage = onHomepage;
g.onRequestFileScope = onRequestFileScope;
g.onFileScopeGranted = onFileScopeGranted;
g.cardSave = cardSave;
g.cardSync = cardSync;
g.cardDemo = cardDemo;
g.cardRefresh = cardRefresh;
g.continueSyncInBackground = continueSyncInBackground;
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
g.runScheduledSync = gatedRunScheduledSync;
g.runWeeklyDigest = runWeeklyDigest;
