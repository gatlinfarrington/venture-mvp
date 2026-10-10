import { COLORS, FONTS } from "../lib/tokens";
import { SHEET_NAMES } from "../lib/config";
import type { NormalizedOrder, NormalizedRefund, NormalizedSubscription } from "../importers/types";
import { computeArr } from "../metrics/arr";
import { computeCohortRetention } from "../metrics/cohorts";
import { revenueByCountry } from "../metrics/country";
import { computeGoalProgress, type GoalProgress } from "../metrics/goals";
import { computeLtv } from "../metrics/ltv";
import { computeMrr } from "../metrics/mrr";
import { computeRefundSummary } from "../metrics/refunds";
import { computeTopProducts } from "../metrics/topProducts";

/**
 * Append Phase-2 growth panels below the classic dashboard (row 37+):
 * ARR/LTV/refunds KPIs, MRR goal bar, cohort grid, top products, revenue by country.
 * Layout uses the same 4-column KPI grid (B–D / F–H / J–L / N–P).
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

  // Same 4-column grid as top KPIs: B–D, F–H, J–L, N–P
  paintMiniKpi(sheet, 38, 2, 4, "ARR", arr.arr, "$#,##0");
  paintMiniKpi(sheet, 38, 6, 8, "LTV (EST.)", ltv.ltv, "$#,##0");
  paintMiniKpi(sheet, 38, 10, 12, "REFUNDS · 30D", refundsSummary.refundAmount, "$#,##0");
  paintMiniKpi(sheet, 38, 14, 16, "REFUND RATE", refundsSummary.refundRate, "0.0%");

  let row = 42;
  sheet.setRowHeight(row, 28);
  sheet.getRange(row, 2).setFontSize(11).setFontWeight("bold").setValue("MRR goal");
  row = 43;
  if (goal.goal > 0) {
    sheet.getRange(row, 2, 1, 15).merge();
    sheet
      .getRange(row, 2)
      .setFontFamily(FONTS.mono)
      .setFontSize(9)
      .setFontColor(COLORS.inkMuted)
      .setValue(
        `$${Math.round(goal.current).toLocaleString("en-US")} of $${Math.round(goal.goal).toLocaleString("en-US")}  ·  ${Math.round(goal.pct * 1000) / 10}%${goal.met ? "  ·  GOAL MET" : ""}`,
      );
    row = 44;
    paintContinuousGoalBar(sheet, row, goal, { label: false, barCols: [2, 16] });
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

  // Tables on the same half-width halves as classic product/source (B–H / J–P)
  sheet.setRowHeight(row, 28);
  sheet.getRange(row, 2, 1, 7).merge();
  sheet.getRange(row, 2).setFontSize(11).setFontWeight("bold").setValue("Top products · 30d");
  sheet.getRange(row, 10, 1, 7).merge();
  sheet.getRange(row, 10).setFontSize(11).setFontWeight("bold").setValue("Revenue by country · 30d");
  row += 1;
  writeGridTable(
    sheet,
    row,
    2,
    ["PRODUCT", "REVENUE", "ORDERS", "SHARE"],
    topProducts.map((p) => [p.product, p.revenue, p.orders, p.share]),
  );
  writeGridTable(
    sheet,
    row,
    10,
    ["COUNTRY", "REVENUE", "ORDERS", "SHARE"],
    byCountry.map((p) => [p.country, p.revenue, p.orders, p.share]),
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
      .setValue("EXAMPLE DATA · growth panels use sample cohorts.");
  }
}

/**
 * Single ink bar on a grey track (one contiguous fill + one remainder), not segmented blocks.
 * Default layout matches classic footer: label in B–D, bar in E–P.
 */
export function paintContinuousGoalBar(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  row: number,
  goal: GoalProgress,
  opts: { label?: boolean; barCols?: [number, number] } = {},
): void {
  sheet.setRowHeight(row, 24);
  const showLabel = opts.label !== false;
  let barStart = opts.barCols?.[0] ?? 5;
  let barEnd = opts.barCols?.[1] ?? 16;

  if (showLabel) {
    sheet.getRange(row, 2, 1, 3).merge();
    sheet
      .getRange(row, 2)
      .setFontFamily(FONTS.mono)
      .setFontSize(8)
      .setFontColor(COLORS.inkMuted)
      .setBackground(COLORS.bg)
      .setValue(
        `MRR GOAL  $${Math.round(goal.current).toLocaleString("en-US")} / $${Math.round(goal.goal).toLocaleString("en-US")}`,
      );
  }

  const span = barEnd - barStart + 1;
  const pct = Math.min(1, Math.max(0, goal.pct));
  const filled = Math.round(pct * span);

  // Clear track first (unmerge if a prior sync left merges)
  try {
    sheet.getRange(row, barStart, 1, span).breakApart();
  } catch {
    /* not merged */
  }
  sheet.getRange(row, barStart, 1, span).setValue("").setBackground(COLORS.surface2);

  if (filled <= 0) {
    sheet.getRange(row, barStart, 1, span).merge().setBackground(COLORS.surface2);
    return;
  }
  if (filled >= span) {
    sheet.getRange(row, barStart, 1, span).merge().setBackground(COLORS.ink);
    return;
  }
  sheet.getRange(row, barStart, 1, filled).merge().setBackground(COLORS.ink);
  sheet.getRange(row, barStart + filled, 1, span - filled).merge().setBackground(COLORS.surface2);
}

function paintMiniKpi(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  labelRow: number,
  c1: number,
  c2: number,
  label: string,
  value: number,
  format: string,
): void {
  const span = c2 - c1 + 1;
  // Top rule is always ink; red only on a negative number (not on refund cards by default).
  const valueColor = value < 0 ? COLORS.danger : COLORS.ink;
  sheet.getRange(labelRow, c1, 1, span).merge();
  sheet
    .getRange(labelRow, c1)
    .setFontFamily(FONTS.mono)
    .setFontSize(8)
    .setFontColor(COLORS.inkMuted)
    .setBackground(COLORS.bg)
    .setBorder(true, true, false, true, false, false, COLORS.hairline, SpreadsheetApp.BorderStyle.SOLID)
    .setBorder(true, null, null, null, false, false, COLORS.ink, SpreadsheetApp.BorderStyle.SOLID_MEDIUM)
    .setValue(label);
  sheet.getRange(labelRow + 1, c1, 1, span).merge();
  sheet
    .getRange(labelRow + 1, c1)
    .setFontFamily(FONTS.sans)
    .setFontSize(18)
    .setFontWeight("bold")
    .setFontColor(valueColor)
    .setBackground(COLORS.bg)
    .setNumberFormat(format)
    .setBorder(false, true, false, true, false, false, COLORS.hairline, SpreadsheetApp.BorderStyle.SOLID)
    .setValue(value);
  sheet.getRange(labelRow + 2, c1, 1, span).merge();
  sheet
    .getRange(labelRow + 2, c1)
    .setBackground(COLORS.bg)
    .setBorder(false, true, true, true, false, false, COLORS.hairline, SpreadsheetApp.BorderStyle.SOLID)
    .setValue("");
}

/**
 * Half-width table aligned to the 4-col KPI grid (startCol 2 → B–H, startCol 10 → J–P).
 * Columns land on card columns with the spacer left blank.
 */
function writeGridTable(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  startRow: number,
  startCol: number,
  headers: string[],
  rows: unknown[][],
): void {
  // Data columns: start, start+2, start+4, start+6 (skip 16px spacers at start+3)
  const cols = [startCol, startCol + 2, startCol + 4, startCol + 6];
  const spacer = startCol + 3;

  for (let r = startRow; r <= startRow + Math.max(rows.length, 1); r++) {
    try {
      sheet.getRange(r, cols[0], 1, 2).merge();
      sheet.getRange(r, cols[2], 1, 2).merge();
    } catch {
      /* already merged */
    }
  }

  headers.forEach((h, i) => {
    sheet
      .getRange(startRow, cols[i])
      .setValue(h)
      .setBackground(COLORS.surface2)
      .setFontFamily(FONTS.mono)
      .setFontSize(8)
      .setFontWeight("bold")
      .setFontColor(COLORS.inkMuted)
      .setBorder(false, false, true, false, false, false, COLORS.border, SpreadsheetApp.BorderStyle.SOLID);
  });
  sheet
    .getRange(startRow, spacer)
    .setBackground(COLORS.surface2)
    .setBorder(false, false, true, false, false, false, COLORS.border, SpreadsheetApp.BorderStyle.SOLID);

  rows.forEach((vals, i) => {
    const row = startRow + 1 + i;
    vals.forEach((v, j) => {
      const cell = sheet.getRange(row, cols[j]);
      cell
        .setValue(v as string | number)
        .setBackground(COLORS.bg)
        .setBorder(false, false, true, false, false, false, COLORS.hairline, SpreadsheetApp.BorderStyle.SOLID);
      if (j === 0) {
        cell.setFontFamily(FONTS.sans).setFontSize(9).setFontColor(COLORS.ink);
      } else {
        cell.setFontFamily(FONTS.mono).setFontSize(9).setHorizontalAlignment("right").setFontColor(COLORS.ink);
        if (j === 1) cell.setNumberFormat("$#,##0");
        else if (j === 2) cell.setNumberFormat("#,##0");
        else cell.setNumberFormat("0.0%");
      }
    });
    sheet
      .getRange(row, spacer)
      .setBackground(COLORS.bg)
      .setBorder(false, false, true, false, false, false, COLORS.hairline, SpreadsheetApp.BorderStyle.SOLID);
  });
}

/** Greyscale heat ramp: darker grey = higher retention; white text where AA needs it. */
function cohortHeatColors(rate: number): { bg: string; fg: string } {
  const t = Math.min(1, Math.max(0, rate));
  // Stops chosen so ink-on-light and white-on-dark both clear AA (~4.5:1).
  const stops: { t: number; bg: [number, number, number]; white: boolean }[] = [
    { t: 0, bg: [255, 255, 255], white: false },
    { t: 0.2, bg: [242, 242, 242], white: false },
    { t: 0.4, bg: [217, 217, 217], white: false },
    { t: 0.55, bg: [176, 176, 176], white: false },
    { t: 0.7, bg: [110, 110, 110], white: true },
    { t: 0.85, bg: [58, 58, 58], white: true },
    { t: 1, bg: [13, 13, 13], white: true },
  ];
  let lo = stops[0];
  let hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].t && t <= stops[i + 1].t) {
      lo = stops[i];
      hi = stops[i + 1];
      break;
    }
  }
  const span = hi.t - lo.t || 1;
  const u = (t - lo.t) / span;
  const rgb = lo.bg.map((c, i) => Math.round(c + (hi.bg[i] - c) * u)) as [number, number, number];
  const hex =
    "#" +
    rgb
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
  const useWhite = u < 0.5 ? lo.white : hi.white;
  return { bg: hex, fg: useWhite ? COLORS.inkInverse : COLORS.ink };
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
    sheet.getRange(row, 2).setFontFamily(FONTS.mono).setFontSize(9).setBackground(COLORS.bg);
    sheet.getRange(row, 3).setFontFamily(FONTS.mono).setFontSize(9).setNumberFormat("#,##0").setBackground(COLORS.bg);
    if (maxAge >= 0) {
      sheet.getRange(row, 4, 1, maxAge + 1).setFontFamily(FONTS.mono).setFontSize(9).setNumberFormat("0%");
      for (let a = 0; a <= maxAge; a++) {
        const cell = cohort.cells.find((c) => c.age === a);
        const target = sheet.getRange(row, 4 + a);
        if (!cell) {
          target.setBackground(COLORS.bg).setFontColor(COLORS.inkMuted);
          continue;
        }
        const { bg, fg } = cohortHeatColors(cell.rate);
        target.setBackground(bg).setFontColor(fg);
      }
    }
  });
}

function writeCohortSheet(
  ss: GoogleAppsScript.Spreadsheet.Spreadsheet,
  cohorts: ReturnType<typeof computeCohortRetention>,
): void {
  if (!cohorts.length) {
    writeEmptyCohortSheet(ss);
    return;
  }
  let sheet = ss.getSheetByName(SHEET_NAMES.cohorts);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAMES.cohorts);
  sheet.clear();
  sheet.clearConditionalFormatRules();
  sheet.setTabColor(COLORS.ink);
  const maxAge = Math.max(11, ...cohorts.map((c) => c.cells.length - 1));
  const headers = ["COHORT", "N", ...Array.from({ length: maxAge + 1 }, (_, i) => `M${i}`)];
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
  sheet
    .getRange(1, 1, 1, headers.length)
    .setFontFamily(FONTS.mono)
    .setFontSize(8)
    .setFontWeight("bold")
    .setFontColor(COLORS.inkMuted)
    .setBackground(COLORS.bg)
    .setBorder(false, false, true, false, false, false, COLORS.ink, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  applyCohortRampRules(sheet, headers.length);
}

/** Empty Cohorts tab: headers + note; greyscale ramp rules stay live. */
export function writeEmptyCohortSheet(ss: GoogleAppsScript.Spreadsheet.Spreadsheet): void {
  let sheet = ss.getSheetByName(SHEET_NAMES.cohorts);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAMES.cohorts);
  sheet.clear();
  sheet.clearConditionalFormatRules();
  sheet.setTabColor(COLORS.ink);
  const headers = ["COHORT", "N", ...Array.from({ length: 12 }, (_, i) => `M${i}`)];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet
    .getRange(1, 1, 1, headers.length)
    .setFontFamily(FONTS.mono)
    .setFontSize(8)
    .setFontWeight("bold")
    .setFontColor(COLORS.inkMuted)
    .setBackground(COLORS.bg)
    .setBorder(false, false, true, false, false, false, COLORS.ink, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  sheet.getRange(3, 1, 1, headers.length).merge();
  sheet
    .getRange(3, 1)
    .setFontFamily(FONTS.sans)
    .setFontSize(10)
    .setFontColor(COLORS.inkMuted)
    .setValue("Cohorts appear after a full month of subscription data.");
  applyCohortRampRules(sheet, headers.length);
}

/** Greyscale conditional format ramp on M0… cells (data rows). */
function applyCohortRampRules(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  colCount: number,
): void {
  // Data starts at col 3 (M0); leave room for many cohort rows.
  const range = sheet.getRange(2, 3, 200, colCount - 2);
  const rules = [
    { min: 0.99, color: "#CCCCCC" },
    { min: 0.9, color: "#D9D9D9" },
    { min: 0.85, color: "#E6E6E6" },
    { min: 0.8, color: "#F2F2F2" },
  ].map(({ min, color }) =>
    SpreadsheetApp.newConditionalFormatRule()
      .whenNumberGreaterThanOrEqualTo(min)
      .setBackground(color)
      .setRanges([range])
      .build(),
  );
  sheet.setConditionalFormatRules(rules);
}
