import { BRAND, managedByFooter } from "../lib/brand";
import { SHEET_NAMES, type DashboardTemplate } from "../lib/config";
import { COLORS, FONTS, CHART_SERIES } from "../lib/tokens";
import type { NormalizedOrder, NormalizedRefund, NormalizedSubscription } from "../importers/types";
import { computeRevenuePeriods } from "../metrics/arpu";
import { computeChurn } from "../metrics/churn";
import { computeGoalProgress } from "../metrics/goals";
import { computeMrr, computeMrrTrend } from "../metrics/mrr";
import { appendGrowthPanels, paintContinuousGoalBar } from "./growthPanels";

export interface DashboardBuildOptions {
  sample?: boolean;
  lastSyncAt?: string;
  sourceLabels?: string[];
  scheduleLabel?: string;
  studioLabel?: string;
  currency?: string;
  licenseNote?: string;
  stale?: boolean;
  /** When true, trial + past_due count toward headline MRR. Default false. */
  includeTrialingPastDue?: boolean;
  backfillIncomplete?: boolean;
  template?: DashboardTemplate;
  mrrGoal?: number;
}

const SOURCE_LABEL: Record<string, string> = {
  lemon_squeezy: "Lemon Squeezy",
  polar: "Polar",
  gumroad: "Gumroad",
  stripe: "Stripe",
  csv: "CSV",
};

/**
 * Rebuild Dashboard to match launch/revenuesheet-dashboard-template.xlsx
 * and SHEET-STYLE.md v2 light revision:
 * white header + ink bottom rule, greyscale charts, green only for meaning.
 */
export function buildDashboard(
  ss: GoogleAppsScript.Spreadsheet.Spreadsheet,
  orders: NormalizedOrder[],
  subscriptions: NormalizedSubscription[],
  refunds: NormalizedRefund[] = [],
  opts: DashboardBuildOptions = {},
): void {
  let sheet = ss.getSheetByName(SHEET_NAMES.dashboard);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAMES.dashboard, 0);
  else {
    ss.setActiveSheet(sheet);
    ss.moveActiveSheet(1);
  }

  for (const c of sheet.getCharts()) sheet.removeChart(c);
  for (const img of sheet.getImages()) img.remove();
  sheet.clear();
  sheet.clearConditionalFormatRules();

  // Launch v2: Dashboard tab is ink, not green
  sheet.setTabColor(COLORS.ink);
  sheet.setHiddenGridlines(true);

  const widths = [24, 88, 88, 88, 16, 88, 88, 88, 16, 88, 88, 88, 16, 88, 88, 88, 24];
  widths.forEach((w, i) => sheet!.setColumnWidth(i + 1, w));

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
    23: 24,
    24: 28,
    34: 24,
    35: 20,
  };
  for (let r = 1; r <= 35; r++) sheet.setRowHeight(r, rowH[r] ?? 21);

  const currency = opts.currency || "USD";
  const studio = opts.studioLabel || (opts.sample ? "EXAMPLE STUDIO" : "YOUR STUDIO");
  const sourceLabels =
    opts.sourceLabels && opts.sourceLabels.length
      ? opts.sourceLabels
      : ["Lemon Squeezy", "Polar", "Gumroad"];

  // —— Row 1: white header + 2px ink bottom rule (no dark band, no logo overlay) ——
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
    .setValue(`${studio} · ${currency}  `);

  // Medium ink rule across A1:Q1
  sheet
    .getRange(1, 1, 1, 17)
    .setBorder(false, false, true, false, false, false, COLORS.ink, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

  // —— Row 2: status band ——
  const syncTime = opts.lastSyncAt || (opts.sample ? "2026-10-09 10:02" : "—");
  const schedule = opts.scheduleLabel || (opts.sample ? "HOURLY" : "MANUAL");
  sheet.getRange(2, 1, 1, 12).merge();
  sheet.getRange(2, 13, 1, 5).merge();

  // Only list sources that were actually connected / provided (Stripe only when connected).
  const connectedLabel =
    sourceLabels.length > 0
      ? sourceLabels.map((s) => s.toUpperCase()).join(", ")
      : "NO SOURCES";
  const statusLeft = opts.stale
    ? `   ● LAST SYNC ${syncTime} · CHECK CONNECTION`
    : `   ● SYNCED ${syncTime} · ${connectedLabel} · ${schedule}`;
  const statusRight = opts.sample
    ? "EXAMPLE DATA · NOT REAL CUSTOMERS  "
    : opts.licenseNote
      ? `${opts.licenseNote}  `
      : "";

  for (let c = 1; c <= 17; c++) {
    sheet
      .getRange(2, c)
      .setBackground(opts.stale ? COLORS.dangerTint : COLORS.surface2)
      .setBorder(false, false, true, false, false, false, COLORS.hairline, SpreadsheetApp.BorderStyle.SOLID);
  }
  // Green ● only; rest of status line is ink (no green fill).
  const statusCell = sheet.getRange(2, 1);
  statusCell
    .setFontFamily(FONTS.mono)
    .setFontSize(8)
    .setVerticalAlignment("middle")
    .setHorizontalAlignment("left");
  if (opts.stale) {
    statusCell.setFontColor(COLORS.danger).setValue(statusLeft);
  } else {
    try {
      const rich = SpreadsheetApp.newRichTextValue()
        .setText(statusLeft)
        .setTextStyle(3, 4, SpreadsheetApp.newTextStyle().setForegroundColor(COLORS.signal).build())
        .setTextStyle(0, 3, SpreadsheetApp.newTextStyle().setForegroundColor(COLORS.ink).build())
        .setTextStyle(4, statusLeft.length, SpreadsheetApp.newTextStyle().setForegroundColor(COLORS.ink).build())
        .build();
      statusCell.setRichTextValue(rich);
    } catch {
      statusCell.setFontColor(COLORS.ink).setValue(statusLeft);
    }
  }
  sheet
    .getRange(2, 13)
    .setFontFamily(FONTS.mono)
    .setFontSize(8)
    .setFontColor(opts.stale ? COLORS.danger : COLORS.inkMuted)
    .setVerticalAlignment("middle")
    .setHorizontalAlignment("right")
    .setValue(statusRight);

  // —— Metrics ——
  const mrrOpts = { includeTrialingPastDue: !!opts.includeTrialingPastDue };
  const mrr = computeMrr(subscriptions, mrrOpts);
  const churn = computeChurn(subscriptions, 30);
  const revenue = computeRevenuePeriods(orders);
  const trend = computeMrrTrend(subscriptions, 12, new Date(), mrrOpts);
  const monthlyChurn = computeMonthlyChurnRates(subscriptions, 12);

  const prevMrr = trend.length >= 2 ? trend[trend.length - 2].mrr : mrr.total;
  const mrrDelta = prevMrr > 0 ? (mrr.total - prevMrr) / prevMrr : 0;
  const netNew = churn.newSubs - churn.cancelled;
  const net30 = computeNetRevenue30d(orders, refunds);
  const productRows = revenueByProductWithSource(orders, 6);
  const sourceRows = revenueBySource30d(orders, refunds);

  // Visible MRR monthly tab (chart source + named range)
  writeMrrMonthlySheet(ss, trend, monthlyChurn);

  const kpiDefs: KpiDef[] = [
    {
      label: "MRR",
      value: mrr.total,
      format: mrr.total >= 10000 ? '$#,##0.0,"k"' : "$#,##0",
      delta: mrrDelta,
      deltaKind: "pct",
      deltaLabel: "",
      inverse: false,
      cols: [2, 4],
    },
    {
      label: "NET REVENUE · 30D",
      value: net30.amount,
      format: "$#,##0",
      delta: net30.deltaPct,
      deltaKind: "pct",
      deltaLabel: "",
      inverse: false,
      cols: [6, 8],
    },
    {
      label: "ACTIVE SUBSCRIPTIONS",
      value: mrr.activeCount,
      format: "#,##0",
      delta: netNew,
      deltaKind: "count",
      deltaLabel: "net new",
      inverse: false,
      cols: [10, 12],
    },
    {
      label: "CHURN · 30D",
      value: churn.rate,
      format: "0.0%",
      delta: churn.deltaPts,
      deltaKind: "pts",
      deltaLabel: "",
      inverse: true,
      cols: [14, 16],
    },
  ];
  for (const kpi of kpiDefs) paintKpiCard(sheet, kpi);

  // Separate trial / past-due KPIs (excluded from headline MRR by default)
  const trialLine = `Trialing ${mrr.trialingCount} · $${Math.round(mrr.trialingMrr).toLocaleString("en-US")}`;
  const pastDueLine = `Past due ${mrr.pastDueCount} · $${Math.round(mrr.pastDueMrr).toLocaleString("en-US")}`;
  const mrrPolicy = opts.includeTrialingPastDue
    ? "MRR includes trial + past due"
    : "MRR = active only (trial/past due excluded)";
  sheet.getRange(7, 2, 1, 15).merge();
  sheet
    .getRange(7, 2)
    .setFontFamily(FONTS.mono)
    .setFontSize(8)
    .setFontColor(COLORS.inkMuted)
    .setVerticalAlignment("middle")
    .setValue(
      `${trialLine}   ·   ${pastDueLine}   ·   ${mrrPolicy}${opts.backfillIncomplete ? "   ·   BACKFILL RESUMING" : ""}`,
    );

  // Section titles
  sheet.getRange(8, 2, 1, 11).merge();
  sheet
    .getRange(8, 2)
    .setFontFamily(FONTS.sans)
    .setFontSize(11)
    .setFontWeight("bold")
    .setVerticalAlignment("bottom")
    .setValue("MRR by source · last 12 months");
  sheet.getRange(8, 14, 1, 3).merge();
  sheet
    .getRange(8, 14)
    .setFontFamily(FONTS.sans)
    .setFontSize(11)
    .setFontWeight("bold")
    .setVerticalAlignment("bottom")
    .setValue("Churn · monthly");

  const mrrSheet = ss.getSheetByName(SHEET_NAMES.mrrMonthly)!;
  const mrrRows = Math.max(trend.length + 1, 2);

  // Greyscale stacked columns (green is NOT a series color)
  const mrrChart = sheet
    .newChart()
    .setChartType(Charts.ChartType.COLUMN)
    .addRange(mrrSheet.getRange(1, 1, mrrRows, 4))
    .setPosition(9, 2, 0, 0)
    .setOption("isStacked", true)
    .setOption("title", "")
    .setOption("legend", {
      position: "top",
      textStyle: { color: COLORS.inkMuted, fontName: FONTS.sans, fontSize: 9 },
    })
    .setOption("colors", [...CHART_SERIES.slice(0, 3)])
    .setOption("backgroundColor", COLORS.bg)
    .setOption("bar", { groupWidth: "58%" })
    .setOption("hAxis", {
      textStyle: { color: COLORS.inkMuted, fontName: FONTS.mono, fontSize: 9 },
    })
    .setOption("vAxis", {
      textStyle: { color: COLORS.inkMuted, fontName: FONTS.mono, fontSize: 9 },
      gridlines: { color: COLORS.hairline },
      format: "$#,##0",
    })
    .setOption("chartArea", { width: "85%", height: "75%" })
    .setOption("width", 792)
    .setOption("height", 294)
    .build();
  sheet.insertChart(mrrChart);

  // Churn line — same axis/label treatment as the MRR chart (no fixed window).
  const churnChart = sheet
    .newChart()
    .setChartType(Charts.ChartType.LINE)
    .addRange(mrrSheet.getRange(1, 1, mrrRows, 1))
    .addRange(mrrSheet.getRange(1, 6, mrrRows, 1))
    .setPosition(9, 14, 0, 0)
    .setOption("title", "")
    .setOption("legend", { position: "none" })
    .setOption("colors", [COLORS.ink])
    .setOption("backgroundColor", COLORS.bg)
    .setOption("lineWidth", 2)
    .setOption("pointSize", 4)
    .setOption("hAxis", {
      textStyle: { color: COLORS.inkMuted, fontName: FONTS.mono, fontSize: 9 },
    })
    .setOption("vAxis", {
      textStyle: { color: COLORS.inkMuted, fontName: FONTS.mono, fontSize: 9 },
      gridlines: { color: COLORS.hairline },
      format: "0.0%",
      minValue: 0,
    })
    .setOption("chartArea", { width: "75%", height: "75%" })
    .setOption("width", 264)
    .setOption("height", 294)
    .build();
  sheet.insertChart(churnChart);

  // Tables
  sheet.getRange(24, 2, 1, 7).merge();
  sheet
    .getRange(24, 2)
    .setFontSize(11)
    .setFontWeight("bold")
    .setVerticalAlignment("bottom")
    .setValue("Revenue by product · 30d");
  sheet.getRange(24, 10, 1, 7).merge();
  sheet
    .getRange(24, 10)
    .setFontSize(11)
    .setFontWeight("bold")
    .setVerticalAlignment("bottom")
    .setValue("Revenue by source · 30d");

  writeProductTable(sheet, 25, productRows, revenue.deltaPct);
  writeSourceTable(sheet, 25, sourceRows);

  const goal = computeGoalProgress(mrr.total, opts.mrrGoal || 0);
  if (goal.goal > 0) {
    paintContinuousGoalBar(sheet, 34, goal);
  }

  sheet.getRange(35, 2, 1, 15).merge();
  sheet
    .getRange(35, 2)
    .setFontFamily(FONTS.mono)
    .setFontSize(8)
    .setFontColor(COLORS.inkMuted)
    .setValue(managedByFooter(opts.sample ? "example data" : "live sync"));

  if ((opts.template || "growth") === "growth") {
    appendGrowthPanels(ss, sheet, orders, subscriptions, refunds, {
      mrrGoal: opts.mrrGoal,
      sample: opts.sample,
      includeTrialingPastDue: opts.includeTrialingPastDue,
    });
  }
}

interface KpiDef {
  label: string;
  value: number;
  format: string;
  delta: number;
  deltaKind: "pct" | "pts" | "count";
  deltaLabel: string;
  inverse: boolean;
  cols: [number, number];
}

function paintKpiCard(sheet: GoogleAppsScript.Spreadsheet.Sheet, kpi: KpiDef): void {
  const [c1, c2] = kpi.cols;
  // Ink top rule by default; red only when the headline number itself is negative.
  const topBorder = kpi.value < 0 ? COLORS.danger : COLORS.ink;
  const span = c2 - c1 + 1;

  sheet
    .getRange(4, c1, 3, span)
    .setBorder(true, true, true, true, false, false, COLORS.hairline, SpreadsheetApp.BorderStyle.SOLID);
  sheet
    .getRange(4, c1, 1, span)
    .setBorder(true, null, null, null, false, false, topBorder, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

  sheet.getRange(4, c1, 1, span).merge();
  sheet
    .getRange(4, c1)
    .setFontFamily(FONTS.mono)
    .setFontSize(8)
    .setFontColor(COLORS.inkMuted)
    .setFontWeight("normal")
    .setHorizontalAlignment("left")
    .setVerticalAlignment("top")
    .setBackground(COLORS.bg)
    .setValue(kpi.label);

  sheet.getRange(5, c1, 1, span).merge();
  sheet
    .getRange(5, c1)
    .setFontFamily(FONTS.sans)
    .setFontSize(22)
    .setFontWeight("bold")
    .setFontColor(COLORS.ink)
    .setBackground(COLORS.bg)
    .setVerticalAlignment("middle")
    .setNumberFormat(kpi.format)
    .setValue(kpi.value);

  sheet.getRange(6, c1, 1, span).merge();
  const up = kpi.delta > 0;
  const down = kpi.delta < 0;
  // Text-only Δ: green ▲ / #B42318 ▼ / grey zero — never cell fills.
  const good = kpi.inverse ? down : up;
  const bad = kpi.inverse ? up : down;
  let text = "– 0.0%";
  if (kpi.deltaKind === "pct") {
    text = `${up ? "▲" : down ? "▼" : "–"} ${Math.abs(kpi.delta * 100).toFixed(1)}%`;
  } else if (kpi.deltaKind === "pts") {
    text = `${up ? "▲" : down ? "▼" : "–"} ${Math.abs(kpi.delta).toFixed(1)} pts`;
  } else {
    text = `${up ? "▲" : down ? "▼" : "–"} ${Math.abs(kpi.delta)}${kpi.deltaLabel ? " " + kpi.deltaLabel : ""}`;
  }
  sheet
    .getRange(6, c1)
    .setFontFamily(FONTS.mono)
    .setFontSize(8)
    .setFontWeight("bold")
    .setBackground(COLORS.bg)
    .setFontColor(good ? COLORS.signal : bad ? COLORS.danger : COLORS.inkMuted)
    .setVerticalAlignment("middle")
    .setValue(text);
}

/** Product table spanning B–H with merges matching the xlsx template. */
function writeProductTable(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  startRow: number,
  rows: { product: string; source: string; revenue: number; delta: number }[],
  totalDelta: number,
): void {
  // Headers on B, D, F, H (with B:C and F:G merges for body)
  for (let r = startRow; r <= startRow + 7; r++) {
    try {
      sheet.getRange(r, 2, 1, 2).merge(); // B:C
      sheet.getRange(r, 6, 1, 2).merge(); // F:G
    } catch {
      /* already merged */
    }
  }

  sheet.getRange(startRow, 2).setValue("PRODUCT");
  sheet.getRange(startRow, 4).setValue("SOURCE");
  sheet.getRange(startRow, 6).setValue("REVENUE");
  sheet.getRange(startRow, 8).setValue("VS PRIOR");
  styleHeaderCells(sheet, startRow, [2, 4, 6, 8]);
  // Fill spacer E in header band
  sheet
    .getRange(startRow, 5)
    .setBackground(COLORS.surface2)
    .setBorder(false, false, true, false, false, false, COLORS.border, SpreadsheetApp.BorderStyle.SOLID);

  let total = 0;
  rows.slice(0, 6).forEach((r, i) => {
    const row = startRow + 1 + i;
    total += r.revenue;
    sheet.getRange(row, 2).setValue(r.product).setFontFamily(FONTS.sans).setFontSize(9);
    sheet
      .getRange(row, 4)
      .setValue(r.source)
      .setFontFamily(FONTS.sans)
      .setFontSize(9)
      .setFontColor(COLORS.inkMuted);
    sheet
      .getRange(row, 6)
      .setValue(r.revenue)
      .setFontFamily(FONTS.mono)
      .setFontSize(9)
      .setNumberFormat("$#,##0")
      .setHorizontalAlignment("right");
    paintDelta(sheet.getRange(row, 8), r.delta);
    for (const c of [2, 4, 5, 6, 8]) {
      sheet
        .getRange(row, c)
        .setBorder(false, false, true, false, false, false, COLORS.hairline, SpreadsheetApp.BorderStyle.SOLID);
    }
  });

  const totalRow = startRow + 1 + Math.min(rows.length, 6);
  sheet.getRange(totalRow, 2).setValue("Total").setFontWeight("bold").setFontFamily(FONTS.sans).setFontSize(9);
  sheet.getRange(totalRow, 4).setValue("");
  sheet
    .getRange(totalRow, 6)
    .setValue(total)
    .setFontWeight("bold")
    .setFontFamily(FONTS.mono)
    .setFontSize(9)
    .setNumberFormat("$#,##0")
    .setHorizontalAlignment("right");
  paintDelta(sheet.getRange(totalRow, 8), totalDelta);
  for (const c of [2, 4, 5, 6, 8]) {
    sheet
      .getRange(totalRow, c)
      .setBorder(true, false, true, false, false, false, COLORS.ink, SpreadsheetApp.BorderStyle.SOLID)
      .setFontWeight("bold");
  }
}

/** Source table spanning J–P. */
function writeSourceTable(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  startRow: number,
  rows: { source: string; revenue: number; share: number; delta: number; status: string; danger?: boolean }[],
): void {
  for (let r = startRow; r <= startRow + Math.max(rows.length, 3); r++) {
    try {
      sheet.getRange(r, 10, 1, 2).merge(); // J:K
    } catch {
      /* already merged */
    }
  }

  sheet.getRange(startRow, 10).setValue("SOURCE");
  sheet.getRange(startRow, 12).setValue("REVENUE");
  sheet.getRange(startRow, 14).setValue("SHARE");
  sheet.getRange(startRow, 15).setValue("VS PRIOR");
  sheet.getRange(startRow, 16).setValue("STATUS");
  styleHeaderCells(sheet, startRow, [10, 12, 14, 15, 16]);
  sheet
    .getRange(startRow, 13)
    .setBackground(COLORS.surface2)
    .setBorder(false, false, true, false, false, false, COLORS.border, SpreadsheetApp.BorderStyle.SOLID);

  rows.forEach((r, i) => {
    const row = startRow + 1 + i;
    sheet
      .getRange(row, 10)
      .setValue(r.source)
      .setFontFamily(FONTS.sans)
      .setFontSize(9)
      .setFontColor(r.danger ? COLORS.danger : COLORS.ink);
    sheet
      .getRange(row, 12)
      .setValue(r.revenue)
      .setFontFamily(FONTS.mono)
      .setFontSize(9)
      .setNumberFormat("$#,##0")
      .setHorizontalAlignment("right")
      .setFontColor(r.danger ? COLORS.danger : COLORS.ink);
    sheet
      .getRange(row, 14)
      .setValue(r.share)
      .setFontFamily(FONTS.mono)
      .setFontSize(9)
      .setNumberFormat("0.0%")
      .setHorizontalAlignment("right")
      .setFontColor(COLORS.inkMuted);
    paintDelta(sheet.getRange(row, 15), r.delta);
    paintSyncedStatus(sheet.getRange(row, 16), r.status);
    for (const c of [10, 12, 13, 14, 15, 16]) {
      sheet
        .getRange(row, c)
        .setBorder(false, false, true, false, false, false, COLORS.hairline, SpreadsheetApp.BorderStyle.SOLID);
    }
  });
}

function styleHeaderCells(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  row: number,
  cols: number[],
): void {
  for (const c of cols) {
    sheet
      .getRange(row, c)
      .setBackground(COLORS.surface2)
      .setFontFamily(FONTS.mono)
      .setFontSize(8)
      .setFontWeight("bold")
      .setFontColor(COLORS.inkMuted)
      .setBorder(false, false, true, false, false, false, COLORS.border, SpreadsheetApp.BorderStyle.SOLID);
  }
}

/** Δ column: text only — green ▲, #B42318 ▼, grey for 0%. No cell fills. */
function paintDelta(cell: GoogleAppsScript.Spreadsheet.Range, delta: number): void {
  const up = delta > 0;
  const down = delta < 0;
  const text = up
    ? `▲ ${(delta * 100).toFixed(1)}%`
    : down
      ? `▼ ${(Math.abs(delta) * 100).toFixed(1)}%`
      : "– 0.0%";
  cell
    .setValue(text)
    .setFontFamily(FONTS.mono)
    .setFontSize(9)
    .setHorizontalAlignment("right")
    .setBackground(COLORS.bg)
    .setFontColor(up ? COLORS.signal : down ? COLORS.danger : COLORS.inkMuted);
}

/** Synced = green ● + ink label, no fill. */
function paintSyncedStatus(cell: GoogleAppsScript.Spreadsheet.Range, status: string): void {
  cell.setFontFamily(FONTS.sans).setFontSize(9).setBackground(COLORS.bg);
  if (!status.includes("Synced")) {
    cell.setFontColor(COLORS.inkMuted).setValue(status);
    return;
  }
  try {
    const rich = SpreadsheetApp.newRichTextValue()
      .setText(status)
      .setTextStyle(0, 1, SpreadsheetApp.newTextStyle().setForegroundColor(COLORS.signal).build())
      .setTextStyle(1, status.length, SpreadsheetApp.newTextStyle().setForegroundColor(COLORS.ink).build())
      .build();
    cell.setRichTextValue(rich);
  } catch {
    cell.setFontColor(COLORS.ink).setValue(status);
  }
}

function writeMrrMonthlySheet(
  ss: GoogleAppsScript.Spreadsheet.Spreadsheet,
  trend: { month: string; mrr: number; bySource: Record<string, number> }[],
  churnSeries: { month: string; ratePct: number }[],
): void {
  // Migrate away from hidden legacy sheet name if present
  const legacy = ss.getSheetByName("_mrr_monthly");
  if (legacy) ss.deleteSheet(legacy);
  const legacyChurn = ss.getSheetByName("_chart_new_churn");
  if (legacyChurn) ss.deleteSheet(legacyChurn);
  const legacyProd = ss.getSheetByName("_chart_products");
  if (legacyProd) ss.deleteSheet(legacyProd);

  let sheet = ss.getSheetByName(SHEET_NAMES.mrrMonthly);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAMES.mrrMonthly);
  sheet.clear();
  sheet.showSheet();
  sheet.setTabColor(COLORS.settingsTab);

  const churnByMonth = new Map(churnSeries.map((c) => [c.month, c.ratePct]));
  const rows: unknown[][] = [["Month", "Lemon Squeezy", "Polar", "Gumroad", "Total MRR", "Churn"]];
  for (const p of trend) {
    const ls = p.bySource.lemon_squeezy || 0;
    const po = p.bySource.polar || 0;
    const gu = p.bySource.gumroad || 0;
    const ratePct = churnByMonth.get(p.month) ?? 2.5;
    rows.push([p.month, ls, po, gu, ls + po + gu, ratePct / 100]);
  }
  sheet.getRange(1, 1, rows.length, 6).setValues(rows);
  sheet.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground(COLORS.surface2);
  if (rows.length > 1) {
    sheet.getRange(2, 2, rows.length - 1, 4).setNumberFormat("$#,##0");
    sheet.getRange(2, 6, rows.length - 1, 1).setNumberFormat("0.0%");
  }
  try {
    ss.setNamedRange("rs_mrr_monthly", sheet.getDataRange());
  } catch {
    /* ignore */
  }
}

function computeMonthlyChurnRates(
  subscriptions: NormalizedSubscription[],
  months: number,
  asOf: Date = new Date(),
): { month: string; ratePct: number }[] {
  const out: { month: string; ratePct: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const start = new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth() - i, 1));
    const end = new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth() - i + 1, 1));
    const key = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`;
    let starting = 0;
    let cancelled = 0;
    for (const sub of subscriptions) {
      const created = Date.parse(sub.created);
      if (Number.isNaN(created) || created >= start.getTime()) continue;
      const cancelledAt = sub.cancelledAt ? Date.parse(sub.cancelledAt) : NaN;
      if (!Number.isNaN(cancelledAt) && cancelledAt < start.getTime()) continue;
      starting += 1;
      if (!Number.isNaN(cancelledAt) && cancelledAt >= start.getTime() && cancelledAt < end.getTime()) {
        cancelled += 1;
      }
    }
    const rate = starting > 0 ? (cancelled / starting) * 100 : 2.5;
    out.push({ month: key, ratePct: Math.round(rate * 10) / 10 });
  }
  return out;
}

function computeNetRevenue30d(
  orders: NormalizedOrder[],
  refunds: NormalizedRefund[],
  asOf: Date = new Date(),
): { amount: number; deltaPct: number } {
  const end = asOf.getTime();
  const start = end - 30 * 86400000;
  const prevStart = start - 30 * 86400000;

  const sumOrders = (from: number, to: number) => {
    let n = 0;
    for (const o of orders) {
      const t = Date.parse(o.created);
      if (Number.isNaN(t) || t < from || t >= to) continue;
      const st = String(o.status || "").toLowerCase();
      if (st === "refunded" || st === "chargeback" || st === "failed") continue;
      n += Number(o.amount) || 0;
    }
    for (const r of refunds) {
      const t = Date.parse(r.created);
      if (Number.isNaN(t) || t < from || t >= to) continue;
      n -= Number(r.amount) || 0;
    }
    return n;
  };

  const cur = sumOrders(start, end);
  const prev = sumOrders(prevStart, start);
  const deltaPct = prev > 0 ? (cur - prev) / prev : cur > 0 ? 1 : 0;
  return { amount: Math.round(cur * 100) / 100, deltaPct: Math.round(deltaPct * 1000) / 1000 };
}

function revenueByProductWithSource(
  orders: NormalizedOrder[],
  topN: number,
): { product: string; source: string; revenue: number; delta: number }[] {
  const now = Date.now();
  const start = now - 30 * 86400000;
  const prevStart = start - 30 * 86400000;
  const cur: Record<string, { product: string; source: string; revenue: number }> = {};
  const prev: Record<string, number> = {};

  for (const o of orders) {
    const t = Date.parse(o.created);
    if (Number.isNaN(t)) continue;
    const st = String(o.status || "").toLowerCase();
    if (st === "refunded" || st === "chargeback" || st === "failed") continue;
    const key = `${o.product}||${o.source}`;
    if (t >= start && t < now) {
      if (!cur[key]) {
        cur[key] = {
          product: o.product,
          source: SOURCE_LABEL[o.source] || o.source,
          revenue: 0,
        };
      }
      cur[key].revenue += Number(o.amount) || 0;
    } else if (t >= prevStart && t < start) {
      prev[key] = (prev[key] || 0) + (Number(o.amount) || 0);
    }
  }

  return Object.entries(cur)
    .map(([key, v]) => {
      const p = prev[key] || 0;
      const delta = p > 0 ? (v.revenue - p) / p : v.revenue > 0 ? 1 : 0;
      return { ...v, revenue: Math.round(v.revenue * 100) / 100, delta: Math.round(delta * 1000) / 1000 };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, topN);
}

function revenueBySource30d(
  orders: NormalizedOrder[],
  refunds: NormalizedRefund[],
): { source: string; revenue: number; share: number; delta: number; status: string; danger?: boolean }[] {
  const now = Date.now();
  const start = now - 30 * 86400000;
  const prevStart = start - 30 * 86400000;
  const cur: Record<string, number> = {};
  const prev: Record<string, number> = {};

  for (const o of orders) {
    const t = Date.parse(o.created);
    if (Number.isNaN(t)) continue;
    const st = String(o.status || "").toLowerCase();
    if (st === "refunded" || st === "chargeback" || st === "failed") continue;
    if (t >= start && t < now) cur[o.source] = (cur[o.source] || 0) + (Number(o.amount) || 0);
    else if (t >= prevStart && t < start) prev[o.source] = (prev[o.source] || 0) + (Number(o.amount) || 0);
  }

  const total = Object.values(cur).reduce((a, b) => a + b, 0) || 1;
  return Object.keys({ ...cur, ...prev })
    .map((s) => {
      const revenue = cur[s] || 0;
      const p = prev[s] || 0;
      const delta = p > 0 ? (revenue - p) / p : revenue > 0 ? 1 : 0;
      return {
        source: SOURCE_LABEL[s] || s,
        revenue: Math.round(revenue * 100) / 100,
        share: revenue / total,
        delta: Math.round(delta * 1000) / 1000,
        status: "● Synced",
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}
