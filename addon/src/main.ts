/**
 * RevenueSheet — Google Sheets add-on entrypoints.
 * Bundled to dist/Code.js for clasp.
 */
import { BRAND } from "./lib/brand";
import {
  getAllSettingsForSidebar,
  setApiKey,
  setDisplayCurrency,
  setLicenseKey,
} from "./lib/properties";
import {
  installSchedule,
  removeSchedule,
  runDemoMode,
  runScheduledSync,
  runSync,
} from "./sync";

function onOpen(): void {
  SpreadsheetApp.getUi()
    .createMenu(BRAND.name)
    .addItem("Open sidebar", "showSidebar")
    .addItem("Sync now", "menuSync")
    .addItem("Full backfill", "menuBackfill")
    .addItem("Load example data", "menuDemo")
    .addSeparator()
    .addItem("Enable hourly refresh", "menuEnableSchedule")
    .addItem("Disable schedule", "menuDisableSchedule")
    .addToUi();
}

function onInstall(_e: GoogleAppsScript.Events.AddonOnInstall): void {
  onOpen();
}

function showSidebar(): void {
  const html = HtmlService.createHtmlOutputFromFile("Sidebar")
    .setTitle(BRAND.name)
    .setWidth(320);
  SpreadsheetApp.getUi().showSidebar(html);
}

function onHomepage(): GoogleAppsScript.Card_Service.Card {
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle(BRAND.name).setSubtitle(BRAND.pitch))
    .addSection(
      CardService.newCardSection()
        .addWidget(
          CardService.newTextParagraph().setText(
            "Open the sidebar from the Extensions menu to connect Lemon Squeezy, Polar, and Gumroad.",
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

function sidebarGetSettings(): Record<string, unknown> {
  return { ...getAllSettingsForSidebar(), brandName: BRAND.name, pitch: BRAND.pitch };
}

function sidebarSaveSettings(payload: {
  lemonSqueezy?: string;
  polar?: string;
  gumroad?: string;
  licenseKey?: string;
  currency?: string;
}): string {
  const maybeSet = (source: "lemon_squeezy" | "polar" | "gumroad", value?: string) => {
    if (value == null || value === "" || value.indexOf("••") === 0) return;
    if (value === "-" || value.toLowerCase() === "clear") setApiKey(source, "");
    else setApiKey(source, value);
  };
  maybeSet("lemon_squeezy", payload.lemonSqueezy);
  maybeSet("polar", payload.polar);
  maybeSet("gumroad", payload.gumroad);
  if (payload.licenseKey && payload.licenseKey.indexOf("••") !== 0) {
    if (payload.licenseKey === "-" || payload.licenseKey.toLowerCase() === "clear") setLicenseKey("");
    else setLicenseKey(payload.licenseKey);
  }
  if (payload.currency) setDisplayCurrency(payload.currency);
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
g.sidebarGetSettings = sidebarGetSettings;
g.sidebarSaveSettings = sidebarSaveSettings;
g.sidebarSync = sidebarSync;
g.sidebarDemo = sidebarDemo;
g.sidebarEnableSchedule = sidebarEnableSchedule;
g.sidebarDisableSchedule = sidebarDisableSchedule;
g.runScheduledSync = runScheduledSync;
