import { COLORS, FONTS } from "../lib/tokens";
import { SHEET_NAMES } from "../lib/config";
import type { NormalizedOrder, NormalizedRefund, NormalizedSubscription } from "../importers/types";
import { computeArr } from "../metrics/arr";
import { computeCohortRetention } from "../metrics/cohorts";
import { revenueByCountry } from "../metrics/country";
import { computeGoalProgress, progressBarSlots } from "../metrics/goals";
import { computeLtv } from "../metrics/ltv";
import { computeMrr } from "../metrics/mrr";
import { computeRefundSummary } from "../metrics/refunds";
import { computeTopProducts } from "../metrics/topProducts";

/**
 * Append Phase-2 growth panels below the classic dashboard (row 37+):
 * ARR/LTV/refunds KPIs, MRR goal bar, cohort grid, top products, revenue by country.
 */
export function appendGrowthPanels(
  ss: GoogleAppsScript.Spreadsheet.Spreadsheet,
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  orders: NormalizedOrder[],
  subscriptions: NormalizedSubscription[],
  refunds: NormalizedRefund[],
  opts: { mrrGoal?: number; sample?: boolean; includeTrialingPastDue?: boolean } = {},
): void {
  const mrrOpts = { includeTrialingPastDue: !!opts.includeTrialingPastDue };
  const mrr = computeMrr(subscriptions, mrrOpts);
  const arr = computeArr(subscriptions, mrrOpts);
  const ltv = computeLtv(subscriptions);
  const refundsSummary = computeRefundSummary(orders, refunds, 30);
  const topProducts = computeTopProducts(orders, 30, 6);
  const byCountry = revenueByCountry(orders, 30, 6);
  const cohorts = computeCohortRetention(subscriptions, 6, 5);
  const goal = computeGoalProgress(mrr.total, opts.mrrGoal || 0);

  sheet.getRange(37, 1, 30, 17).clear();
  for (let r = 37; r <= 66; r++) sheet.setRowHeight(r, 21);
  sheet.setRowHeight(37, 28);
  sheet.setRowHeight(38, 22);
  sheet.setRowHeight(39, 40);
  sheet.setRowHeight(40, 22);

  sheet.getRange(37, 2).setFontSize(11).setFontWeight("bold").setValue("Growth metrics");

  paintMiniKpi(sheet, 38, 2, 4, "ARR", arr.arr, "$#,##0");
  paintMiniKpi(sheet, 38, 6, 8, "LTV (EST.)", ltv.ltv, "$#,##0");
  paintMiniKpi(sheet, 38, 10, 12, "REFUNDS · 30D", refundsSummary.refundAmount, "$#,##0", true);
  paintMiniKpi(sheet, 38, 14, 16, "REFUND RATE", refundsSummary.refundRate, "0.0%", true);

  let row = 42;
  sheet.setRowHeight(row, 28);
  sheet.getRange(row, 2).setFontSize(11).setFontWeight("bold").setValue("MRR goal");
  row = 43;
  if (goal.goal > 0) {
    sheet.getRange(row, 2, 1, 8).merge();
    sheet
      .getRange(row, 2)
      .setFontFamily(FONTS.mono)
      .setFontSize(9)
      .setFontColor(COLORS.inkMuted)
      .setValue(
        `$${Math.round(goal.current).toLocaleString("en-US")} of $${Math.round(goal.goal).toLocaleString("en-US")}  ·  ${Math.round(goal.pct * 1000) / 10}%${goal.met ? "  ·  GOAL MET" : ""}`,
      );
    row = 44;
    const slots = 16;
    const filled = progressBarSlots(goal.pct, slots);
    for (let i = 0; i < slots; i++) {
      const cell = sheet.getRange(row, 2 + i);
      cell.setValue(" ");
      cell.setBackground(i < filled ? (goal.met ? COLORS.signal : COLORS.ink) : COLORS.surface2);
      cell.setBorder(true, true, true, true, false, false, COLORS.hairline, SpreadsheetApp.BorderStyle.SOLID);
    }
    row = 46;
  } else {
    sheet
      .getRange(row, 2)
      .setFontFamily(FONTS.mono)
      .setFontSize(8)
      .setFontColor(COLORS.inkMuted)
      .setValue("Set an MRR goal in the sidebar to track progress.");
    row = 45;
  }

  sheet.setRowHeight(row, 28);
  sheet.getRange(row, 2).setFontSize(11).setFontWeight("bold").setValue("Top products · 30d");
  sheet.getRange(row, 10).setFontSize(11).setFontWeight("bold").setValue("Revenue by country · 30d");
  row += 1;
  writeSimpleTable(
    sheet,
    row,
    2,
    ["PRODUCT", "REVENUE", "ORDERS", "SHARE"],
    topProducts.map((p) => [p.product, p.revenue, p.orders, p.share]),
    [2, 3, 4],
  );
  writeSimpleTable(
    sheet,
    row,
    10,
    ["COUNTRY", "REVENUE", "ORDERS", "SHARE"],
    byCountry.map((p) => [p.country, p.revenue, p.orders, p.share]),
    [2, 3, 4],
  );

  row += Math.max(topProducts.length, byCountry.length, 1) + 3;

  sheet.setRowHeight(row, 28);
  sheet.getRange(row, 2).setFontSize(11).setFontWeight("bold").setValue("Cohort retention (logo)");
  row += 1;
  writeCohortSheet(ss, cohorts);
  writeCohortGrid(sheet, row, cohorts);

  if (opts.sample) {
    sheet
      .getRange(row + cohorts.length + 3, 2)
      .setFontFamily(FONTS.mono)
      .setFontSize(8)
      .setFontColor(COLORS.danger)
      .setValue("EXAMPLE DATA — growth panels use sample cohorts.");
  }
}

function paintMiniKpi(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  labelRow: number,
  c1: number,
  c2: number,
  label: string,
  value: number,
  format: string,
  dangerTone = false,
): void {
  const span = c2 - c1 + 1;
  sheet.getRange(labelRow, c1, 1, span).merge();
  sheet
    .getRange(labelRow, c1)
    .setFontFamily(FONTS.mono)
    .setFontSize(8)
    .setFontColor(COLORS.inkMuted)
    .setBorder(true, true, false, true, false, false, COLORS.hairline, SpreadsheetApp.BorderStyle.SOLID)
    .setBorder(true, null, null, null, false, false, COLORS.ink, SpreadsheetApp.BorderStyle.SOLID_MEDIUM)
    .setValue(label);
  sheet.getRange(labelRow + 1, c1, 1, span).merge();
  sheet
    .getRange(labelRow + 1, c1)
    .setFontFamily(FONTS.sans)
    .setFontSize(18)
    .setFontWeight("bold")
    .setFontColor(dangerTone ? COLORS.danger : COLORS.ink)
    .setNumberFormat(format)
    .setBorder(false, true, false, true, false, false, COLORS.hairline, SpreadsheetApp.BorderStyle.SOLID)
    .setValue(value);
  sheet.getRange(labelRow + 2, c1, 1, span).merge();
  sheet
    .getRange(labelRow + 2, c1)
    .setBorder(false, true, true, true, false, false, COLORS.hairline, SpreadsheetApp.BorderStyle.SOLID)
    .setValue("");
}

function writeSimpleTable(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  startRow: number,
  startCol: number,
  headers: string[],
  rows: unknown[][],
  numericCols: number[],
): void {
  sheet.getRange(startRow, startCol, 1, headers.length).setValues([headers]);
  sheet
    .getRange(startRow, startCol, 1, headers.length)
    .setBackground(COLORS.surface2)
    .setFontFamily(FONTS.mono)
    .setFontSize(8)
    .setFontWeight("bold")
    .setFontColor(COLORS.inkMuted);
  if (rows.length) {
    sheet.getRange(startRow + 1, startCol, rows.length, headers.length).setValues(rows);
    sheet
      .getRange(startRow + 1, startCol, rows.length, headers.length)
      .setFontFamily(FONTS.sans)
      .setFontSize(9);
    for (const rel of numericCols) {
      const col = startCol + rel - 1;
      const range = sheet.getRange(startRow + 1, col, rows.length, 1);
      range.setFontFamily(FONTS.mono).setHorizontalAlignment("right");
      if (rel === 2) range.setNumberFormat("$#,##0");
      else if (rel === 4) range.setNumberFormat("0.0%");
      else range.setNumberFormat("#,##0");
    }
  }
}

function writeCohortGrid(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  startRow: number,
  cohorts: ReturnType<typeof computeCohortRetention>,
): void {
  const maxAge = Math.max(0, ...cohorts.map((c) => c.cells.length - 1));
  const headers = ["COHORT", "N", ...Array.from({ length: maxAge + 1 }, (_, i) => `M${i}`)];
  sheet.getRange(startRow, 2, 1, headers.length).setValues([headers]);
  sheet
    .getRange(startRow, 2, 1, headers.length)
    .setBackground(COLORS.surface2)
    .setFontFamily(FONTS.mono)
    .setFontSize(8)
    .setFontWeight("bold")
    .setFontColor(COLORS.inkMuted);

  cohorts.forEach((cohort, i) => {
    const row = startRow + 1 + i;
    const values: unknown[] = [cohort.cohortMonth, cohort.starting];
    for (let age = 0; age <= maxAge; age++) {
      const cell = cohort.cells.find((c) => c.age === age);
      values.push(cell ? cell.rate : "");
    }
    sheet.getRange(row, 2, 1, values.length).setValues([values]);
    sheet.getRange(row, 2).setFontFamily(FONTS.mono).setFontSize(9);
    sheet.getRange(row, 3).setFontFamily(FONTS.mono).setFontSize(9).setNumberFormat("#,##0");
    if (maxAge >= 0) {
      sheet.getRange(row, 4, 1, maxAge + 1).setFontFamily(FONTS.mono).setFontSize(9).setNumberFormat("0%");
      for (let a = 0; a <= maxAge; a++) {
        const cell = cohort.cells.find((c) => c.age === a);
        if (!cell) continue;
        const target = sheet.getRange(row, 4 + a);
        if (cell.rate >= 0.8) target.setBackground(COLORS.signalTint).setFontColor(COLORS.signal);
        else if (cell.rate < 0.5 && cell.rate > 0) {
          target.setBackground(COLORS.dangerTint).setFontColor(COLORS.danger);
        }
      }
    }
  });
}

function writeCohortSheet(
  ss: GoogleAppsScript.Spreadsheet.Spreadsheet,
  cohorts: ReturnType<typeof computeCohortRetention>,
): void {
  let sheet = ss.getSheetByName(SHEET_NAMES.cohorts);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAMES.cohorts);
  sheet.clear();
  sheet.setTabColor(COLORS.settingsTab);
  const maxAge = Math.max(0, ...cohorts.map((c) => c.cells.length - 1));
  const headers = ["Cohort", "Starting", ...Array.from({ length: maxAge + 1 }, (_, i) => `M${i}`)];
  const rows: unknown[][] = [headers];
  for (const c of cohorts) {
    const row: unknown[] = [c.cohortMonth, c.starting];
    for (let age = 0; age <= maxAge; age++) {
      const cell = c.cells.find((x) => x.age === age);
      row.push(cell ? cell.rate : "");
    }
    rows.push(row);
  }
  sheet.getRange(1, 1, rows.length, headers.length).setValues(rows);
}
