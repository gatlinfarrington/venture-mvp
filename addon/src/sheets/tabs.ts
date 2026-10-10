import { SHEET_NAMES } from "../lib/config";
import { COLORS } from "../lib/tokens";

/** Canonical tab order (lookup remains by name). */
export const TAB_ORDER = [
  SHEET_NAMES.dashboard,
  SHEET_NAMES.cohorts,
  SHEET_NAMES.orders,
  SHEET_NAMES.subscriptions,
  SHEET_NAMES.customers,
  SHEET_NAMES.refunds,
  SHEET_NAMES.mrrMonthly,
  SHEET_NAMES.settings,
] as const;

const TAB_COLORS: Record<string, string> = {
  [SHEET_NAMES.dashboard]: COLORS.ink,
  [SHEET_NAMES.cohorts]: COLORS.ink,
  [SHEET_NAMES.orders]: COLORS.ink,
  [SHEET_NAMES.subscriptions]: COLORS.ink,
  [SHEET_NAMES.customers]: COLORS.ink,
  [SHEET_NAMES.refunds]: COLORS.danger,
  [SHEET_NAMES.mrrMonthly]: COLORS.settingsTab,
  [SHEET_NAMES.settings]: COLORS.settingsTab,
};

/** Ensure every named tab exists (empty if new). */
export function ensureAllTabs(ss: GoogleAppsScript.Spreadsheet.Spreadsheet): void {
  for (const name of TAB_ORDER) {
    if (!ss.getSheetByName(name)) ss.insertSheet(name);
  }
}

/** Apply tab colors and reorder to match the blank template. */
export function applyTabOrderAndColors(ss: GoogleAppsScript.Spreadsheet.Spreadsheet): void {
  ensureAllTabs(ss);
  for (const name of TAB_ORDER) {
    const sheet = ss.getSheetByName(name);
    if (!sheet) continue;
    const color = TAB_COLORS[name];
    if (color) sheet.setTabColor(color);
  }
  // moveActiveSheet positions are 1-based; move in order so each lands at its index.
  for (let i = 0; i < TAB_ORDER.length; i++) {
    const sheet = ss.getSheetByName(TAB_ORDER[i]);
    if (!sheet) continue;
    ss.setActiveSheet(sheet);
    ss.moveActiveSheet(i + 1);
  }
}
