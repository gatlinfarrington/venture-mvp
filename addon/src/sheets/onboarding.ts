import { BRAND } from "../lib/brand";
import {
  EMPTY_CHART_COPY,
  EMPTY_STATUS_LEFT,
  EMPTY_STATUS_RIGHT,
  EMPTY_STEPS,
  SYNCING_CHART_COPY,
  progressBarLabel,
  progressPctForSource,
  statusLabel,
  syncingStatusLeft,
  syncingStatusRight,
  type BackfillSourceRow,
} from "../lib/onboardingCopy";
import { COLORS, FONTS } from "../lib/tokens";

const EN_DASH = "\u2013";

export interface EmptyDashboardOpts {
  currency?: string;
  studioLabel?: string;
}

export interface SyncingDashboardOpts {
  currency?: string;
  studioLabel?: string;
  lastUpdate: string;
  activeLabel: string;
  ordersSoFar: number;
  totalKnown?: number;
  doneLabels: string[];
  sources: BackfillSourceRow[];
  /** Partial KPI values while backfilling (undefined → en-dash). */
  partial?: {
    mrr?: number;
    net30?: number;
    activeSubs?: number;
  };
}

/** Shared layout shell: column widths, white canvas, header + store line. */
function paintShell(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  opts: { currency: string; studio: string },
): void {
  for (const c of sheet.getCharts()) sheet.removeChart(c);
  for (const img of sheet.getImages()) img.remove();
  sheet.clear();
  sheet.clearConditionalFormatRules();
  sheet.setTabColor(COLORS.ink);
  sheet.setHiddenGridlines(true);

  const widths = [24, 88, 88, 88, 16, 88, 88, 88, 16, 88, 88, 88, 16, 88, 88, 88, 24];
  widths.forEach((w, i) => sheet.setColumnWidth(i + 1, w));

  sheet
    .getRange(1, 1, 40, 17)
    .setFontFamily(FONTS.sans)
    .setFontSize(9)
    .setFontColor(COLORS.ink)
    .setBackground(COLORS.bg);

  const rowH: Record<number, number> = {
    1: 56,
    2: 28,
    3: 20,
    4: 22,
    5: 40,
    6: 22,
    7: 24,
    8: 28,
  };
  for (let r = 1; r <= 35; r++) sheet.setRowHeight(r, rowH[r] ?? 21);

  sheet.getRange(1, 1, 1, 12).merge();
  sheet
    .getRange(1, 1)
    .setBackground(COLORS.bg)
    .setFontColor(COLORS.ink)
    .setFontFamily(FONTS.sans)
    .setFontSize(15)
    .setFontWeight("bold")
    .setVerticalAlignment("middle")
    .setValue(`   ${BRAND.dashboardTitle}`);

  sheet.getRange(1, 13, 1, 5).merge();
  sheet
    .getRange(1, 13)
    .setBackground(COLORS.bg)
    .setFontColor(COLORS.inkMuted)
    .setFontFamily(FONTS.mono)
    .setFontSize(8)
    .setHorizontalAlignment("right")
    .setVerticalAlignment("middle")
    .setValue(`${opts.studio} · ${opts.currency}  `);

  sheet
    .getRange(1, 1, 1, 17)
    .setBorder(false, false, true, false, false, false, COLORS.ink, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
}

function paintStatusBand(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  left: string,
  right: string,
): void {
  sheet.getRange(2, 1, 1, 12).merge();
  sheet.getRange(2, 13, 1, 5).merge();
  for (let c = 1; c <= 17; c++) {
    sheet
      .getRange(2, c)
      .setBackground(COLORS.surface2)
      .setBorder(false, false, true, false, false, false, COLORS.hairline, SpreadsheetApp.BorderStyle.SOLID);
  }
  sheet
    .getRange(2, 1)
    .setFontFamily(FONTS.mono)
    .setFontSize(8)
    .setFontColor(COLORS.inkMuted)
    .setVerticalAlignment("middle")
    .setHorizontalAlignment("left")
    .setValue(`   ${left}`);
  sheet
    .getRange(2, 13)
    .setFontFamily(FONTS.mono)
    .setFontSize(8)
    .setFontColor(COLORS.inkMuted)
    .setVerticalAlignment("middle")
    .setHorizontalAlignment("right")
    .setValue(`${right}  `);
}

function paintEmptyKpi(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  cols: [number, number],
  label: string,
): void {
  const [c1, c2] = cols;
  const span = c2 - c1 + 1;
  sheet
    .getRange(4, c1, 3, span)
    .setBorder(true, true, true, true, false, false, COLORS.hairline, SpreadsheetApp.BorderStyle.SOLID);
  sheet
    .getRange(4, c1, 1, span)
    .setBorder(true, null, null, null, false, false, COLORS.ink, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  sheet.getRange(4, c1, 1, span).merge();
  sheet
    .getRange(4, c1)
    .setFontFamily(FONTS.mono)
    .setFontSize(8)
    .setFontColor(COLORS.inkMuted)
    .setBackground(COLORS.bg)
    .setValue(label);
  sheet.getRange(5, c1, 1, span).merge();
  sheet
    .getRange(5, c1)
    .setFontFamily(FONTS.sans)
    .setFontSize(22)
    .setFontWeight("bold")
    .setFontColor(COLORS.inkMuted)
    .setBackground(COLORS.bg)
    .setValue(EN_DASH);
  sheet.getRange(6, c1, 1, span).merge();
  sheet
    .getRange(6, c1)
    .setFontFamily(FONTS.mono)
    .setFontSize(8)
    .setFontColor(COLORS.inkMuted)
    .setBackground(COLORS.bg)
    .setValue("Connect a source");
}

function paintPartialKpi(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  cols: [number, number],
  label: string,
  value: number | undefined,
  format: string,
  subline: string,
): void {
  const [c1, c2] = cols;
  const span = c2 - c1 + 1;
  sheet
    .getRange(4, c1, 3, span)
    .setBorder(true, true, true, true, false, false, COLORS.hairline, SpreadsheetApp.BorderStyle.SOLID);
  sheet
    .getRange(4, c1, 1, span)
    .setBorder(true, null, null, null, false, false, COLORS.ink, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  sheet.getRange(4, c1, 1, span).merge();
  sheet
    .getRange(4, c1)
    .setFontFamily(FONTS.mono)
    .setFontSize(8)
    .setFontColor(COLORS.inkMuted)
    .setBackground(COLORS.bg)
    .setValue(label);
  sheet.getRange(5, c1, 1, span).merge();
  const valueCell = sheet.getRange(5, c1);
  valueCell
    .setFontFamily(FONTS.sans)
    .setFontSize(22)
    .setFontWeight("bold")
    .setFontColor(COLORS.ink)
    .setBackground(COLORS.bg);
  if (value == null) {
    valueCell.setFontColor(COLORS.inkMuted).setValue(EN_DASH);
  } else {
    valueCell.setNumberFormat(format).setValue(value);
  }
  sheet.getRange(6, c1, 1, span).merge();
  sheet
    .getRange(6, c1)
    .setFontFamily(FONTS.mono)
    .setFontSize(8)
    .setFontColor(COLORS.inkMuted)
    .setBackground(COLORS.bg)
    .setValue(subline);
}

function paintStepCard(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  startCol: number,
  step: { n: string; title: string; body: string },
): void {
  // Cards span 3 content cols (B–D / G–I / L–N style): startCol .. startCol+2
  const c1 = startCol;
  const span = 3;
  sheet
    .getRange(9, c1, 1, span)
    .setBorder(true, null, null, null, false, false, COLORS.ink, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  sheet.getRange(9, c1, 1, span).merge();
  sheet
    .getRange(9, c1)
    .setFontFamily(FONTS.mono)
    .setFontSize(8)
    .setFontColor(COLORS.inkMuted)
    .setValue(`${step.n}  ${step.title.toUpperCase()}`);
  sheet.getRange(10, c1, 1, span).merge();
  sheet
    .getRange(10, c1)
    .setFontFamily(FONTS.sans)
    .setFontSize(11)
    .setFontWeight("bold")
    .setFontColor(COLORS.ink)
    .setValue(step.title);
  sheet.getRange(11, c1, 3, span).merge();
  sheet
    .getRange(11, c1)
    .setFontFamily(FONTS.sans)
    .setFontSize(9)
    .setFontColor(COLORS.inkMuted)
    .setWrap(true)
    .setVerticalAlignment("top")
    .setValue(step.body);
}

function paintChartPlaceholder(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  copy: string,
): void {
  // B18:P22
  sheet.getRange(18, 2, 5, 15).merge();
  sheet
    .getRange(18, 2)
    .setBorder(true, true, true, true, false, false, COLORS.hairline, SpreadsheetApp.BorderStyle.SOLID)
    .setFontFamily(FONTS.sans)
    .setFontSize(10)
    .setFontColor(COLORS.inkMuted)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setWrap(true)
    .setValue(copy);
}

function paintPlaceholderTables(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  rowCopy: string,
): void {
  sheet.getRange(24, 2, 1, 7).merge();
  sheet
    .getRange(24, 2)
    .setFontSize(11)
    .setFontWeight("bold")
    .setValue("Revenue by product · 30d");
  sheet.getRange(24, 10, 1, 7).merge();
  sheet
    .getRange(24, 10)
    .setFontSize(11)
    .setFontWeight("bold")
    .setValue("Revenue by source · 30d");

  const headersL = ["PRODUCT", "REVENUE", "ORDERS", "Δ"];
  const headersR = ["SOURCE", "REVENUE", "ORDERS", "SHARE"];
  headersL.forEach((h, i) => {
    sheet
      .getRange(25, 2 + i * 2)
      .setValue(h)
      .setFontFamily(FONTS.mono)
      .setFontSize(8)
      .setFontWeight("bold")
      .setFontColor(COLORS.inkMuted)
      .setBackground(COLORS.surface2);
  });
  headersR.forEach((h, i) => {
    sheet
      .getRange(25, 10 + i * 2)
      .setValue(h)
      .setFontFamily(FONTS.mono)
      .setFontSize(8)
      .setFontWeight("bold")
      .setFontColor(COLORS.inkMuted)
      .setBackground(COLORS.surface2);
  });
  sheet.getRange(26, 2, 1, 7).merge();
  sheet
    .getRange(26, 2)
    .setFontFamily(FONTS.mono)
    .setFontSize(9)
    .setFontColor(COLORS.inkMuted)
    .setValue(rowCopy);
  sheet.getRange(26, 10, 1, 7).merge();
  sheet
    .getRange(26, 10)
    .setFontFamily(FONTS.mono)
    .setFontSize(9)
    .setFontColor(COLORS.inkMuted)
    .setValue(rowCopy === "No orders yet" ? "No sources connected" : rowCopy);
}

function paintBackfillProgress(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  sources: BackfillSourceRow[],
): void {
  sheet.getRange(8, 2, 1, 15).merge();
  sheet
    .getRange(8, 2)
    .setFontFamily(FONTS.sans)
    .setFontSize(11)
    .setFontWeight("bold")
    .setValue("Backfill progress");

  const headers = ["SOURCE", "PROGRESS", "ROWS", "STATUS"];
  // B / F / J / N
  const cols = [2, 6, 10, 14];
  headers.forEach((h, i) => {
    sheet
      .getRange(9, cols[i])
      .setValue(h)
      .setFontFamily(FONTS.mono)
      .setFontSize(8)
      .setFontWeight("bold")
      .setFontColor(COLORS.inkMuted)
      .setBackground(COLORS.bg)
      .setBorder(true, null, null, null, false, false, COLORS.ink, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  });

  sources.forEach((src, i) => {
    const r = 10 + i;
    const pct = progressPctForSource(src);
    sheet
      .getRange(r, 2)
      .setFontFamily(FONTS.sans)
      .setFontSize(9)
      .setFontColor(COLORS.ink)
      .setValue(src.label);
    sheet.getRange(r, 6, 1, 3).merge();
    sheet
      .getRange(r, 6)
      .setFontFamily(FONTS.mono)
      .setFontSize(9)
      .setFontColor(COLORS.ink)
      .setValue(progressBarLabel(pct));
    sheet
      .getRange(r, 10)
      .setFontFamily(FONTS.mono)
      .setFontSize(9)
      .setFontColor(COLORS.ink)
      .setNumberFormat("#,##0")
      .setValue(src.rows);
    const status = statusLabel(src.status);
    const statusCell = sheet.getRange(r, 14);
    statusCell.setFontFamily(FONTS.sans).setFontSize(9).setBackground(COLORS.bg);
    if (src.status === "synced") {
      try {
        const rich = SpreadsheetApp.newRichTextValue()
          .setText(status)
          .setTextStyle(0, 1, SpreadsheetApp.newTextStyle().setForegroundColor(COLORS.signal).build())
          .setTextStyle(1, status.length, SpreadsheetApp.newTextStyle().setForegroundColor(COLORS.ink).build())
          .build();
        statusCell.setRichTextValue(rich);
      } catch {
        statusCell.setFontColor(COLORS.signal).setValue(status);
      }
    } else if (src.status === "backfilling") {
      statusCell.setFontColor(COLORS.ink).setValue(status);
    } else {
      statusCell.setFontColor(COLORS.inkMuted).setValue(status);
    }
  });
}

/** First-open empty state (no source connected). */
export function paintEmptyDashboard(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  opts: EmptyDashboardOpts = {},
): void {
  const currency = opts.currency || "USD";
  const studio = opts.studioLabel || "YOUR STORE";
  paintShell(sheet, { currency, studio });
  paintStatusBand(sheet, EMPTY_STATUS_LEFT, EMPTY_STATUS_RIGHT);

  paintEmptyKpi(sheet, [2, 4], "MRR");
  paintEmptyKpi(sheet, [6, 8], "NET REVENUE · 30D");
  paintEmptyKpi(sheet, [10, 12], "ACTIVE SUBSCRIPTIONS");
  paintEmptyKpi(sheet, [14, 16], "CHURN · 30D");

  sheet.getRange(8, 2, 1, 15).merge();
  sheet
    .getRange(8, 2)
    .setFontFamily(FONTS.sans)
    .setFontSize(11)
    .setFontWeight("bold")
    .setValue("Welcome. Three steps to your first numbers.");

  // Step cards at B, G, L (cols 2, 7, 12)
  paintStepCard(sheet, 2, EMPTY_STEPS[0]);
  paintStepCard(sheet, 7, EMPTY_STEPS[1]);
  paintStepCard(sheet, 12, EMPTY_STEPS[2]);

  paintChartPlaceholder(sheet, EMPTY_CHART_COPY);
  paintPlaceholderTables(sheet, "No orders yet");
}

/** Mid-backfill syncing state. */
export function paintSyncingDashboard(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  opts: SyncingDashboardOpts,
): void {
  const currency = opts.currency || "USD";
  const studio = opts.studioLabel || "YOUR STORE";
  paintShell(sheet, { currency, studio });

  const left = syncingStatusLeft({
    activeLabel: opts.activeLabel,
    ordersSoFar: opts.ordersSoFar,
    totalKnown: opts.totalKnown,
  });
  const right = syncingStatusRight({
    lastUpdate: opts.lastUpdate,
    doneLabels: opts.doneLabels,
  });
  paintStatusBand(sheet, left, right);

  paintPartialKpi(sheet, [2, 4], "MRR", opts.partial?.mrr, "$#,##0", "Partial · backfilling");
  paintPartialKpi(sheet, [6, 8], "NET REVENUE · 30D", opts.partial?.net30, "$#,##0", "Partial · backfilling");
  paintPartialKpi(
    sheet,
    [10, 12],
    "ACTIVE SUBSCRIPTIONS",
    opts.partial?.activeSubs,
    "#,##0",
    "Partial · backfilling",
  );
  paintPartialKpi(sheet, [14, 16], "CHURN · 30D", undefined, "0.0%", "Needs 2 full months");

  paintBackfillProgress(sheet, opts.sources);
  // Progress table uses rows 8–14; chart starts at 18
  paintChartPlaceholder(sheet, SYNCING_CHART_COPY);
  paintPlaceholderTables(sheet, "Fills in when the backfill finishes");
}
