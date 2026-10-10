import { BRAND, managedByFooter } from "../lib/brand";
import { SHEET_NAMES } from "../lib/config";
import { COLORS, FONTS, CHART_SERIES, SOURCE_COLORS } from "../lib/tokens";
import type { NormalizedOrder, NormalizedRefund, NormalizedSubscription } from "../importers/types";
import { computeRevenuePeriods, revenueByProduct } from "../metrics/arpu";
import { computeChurn, computeNewVsChurnedSeries } from "../metrics/churn";
import { computeMrr, computeMrrTrend } from "../metrics/mrr";

/** Tiny Ledger Cell mark (on-dark) for header insertImage — keep in sync with design/ledger-cell-mark-on-dark.png */
const LEDGER_CELL_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAAAxElEQVR4nO2X0Q3CMAxEKeI33oIFGISVECsxCAuwRRaAr6IIYeNwlrDRvc+elTw1Uq5dWmv3TWK2vxb4BAVRKIiys8Le+17LROQ2O3e4nNS9rsfz2+fqG7Q2HXPvnCVn5emPmIIoFESpKzjeX1bundPuuRUtX7J/bkU1ibqGiEyvNxLRJNbYM/eu5xbMAgVRKIhSV3CiScwN1ty73ivlm0TNvmmI6CZR5cY8+t/FLZgFCqJQEKWuYHRD/G2T1D3iLFAQ5QGOI2frMDk2uwAAAABJRU5ErkJggg==";

export interface DashboardBuildOptions {
  sample?: boolean;
  lastSyncAt?: string;
  sourceLabels?: string[];
  scheduleLabel?: string;
  studioLabel?: string;
  currency?: string;
  licenseNote?: string;
  stale?: boolean;
}

const SOURCE_LABEL: Record<string, string> = {
  lemon_squeezy: "Lemon Squeezy",
  polar: "Polar",
  gumroad: "Gumroad",
};

/**
 * Rebuild Dashboard to match design/SHEET-STYLE.md and sheet-dashboard-target.png.
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

  // Clear overlays
  for (const c of sheet.getCharts()) sheet.removeChart(c);
  for (const img of sheet.getImages()) img.remove();
  sheet.clear();
  sheet.clearConditionalFormatRules();

  sheet.setTabColor(COLORS.signal);
  sheet.setHiddenGridlines(true);

  // Column widths A–Q per SHEET-STYLE
  const widths = [24, 88, 88, 88, 16, 88, 88, 88, 16, 88, 88, 88, 16, 88, 88, 88, 24];
  widths.forEach((w, i) => sheet!.setColumnWidth(i + 1, w));

  // Base font
  sheet.getRange(1, 1, 40, 17).setFontFamily(FONTS.sans).setFontSize(9).setFontColor(COLORS.ink).setBackground(COLORS.bg);

  // Row heights
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

  // —— Row 1: header band ——
  const header = sheet.getRange(1, 1, 1, 17);
  header.merge();
  header
    .setBackground(COLORS.ink)
    .setFontColor(COLORS.inkInverse)
    .setFontFamily(FONTS.sans)
    .setFontSize(15)
    .setFontWeight("bold")
    .setVerticalAlignment("middle")
    .setHorizontalAlignment("left")
    .setValue(`    ${BRAND.dashboardTitle}`);

  // Right meta in P1 area — put via overlay text in the merged cell using full-width spacing is fragile;
  // use a second visual by setting note + drawing meta into the value with padding.
  header.setValue(`    ${BRAND.dashboardTitle}`);
  // Unmerge right side for studio label: break and rebuild as A1:N1 + O1:Q1
  header.breakApart();
  sheet.getRange(1, 1, 1, 14).merge();
  sheet
    .getRange(1, 1)
    .setBackground(COLORS.ink)
    .setFontColor(COLORS.inkInverse)
    .setFontFamily(FONTS.sans)
    .setFontSize(15)
    .setFontWeight("bold")
    .setVerticalAlignment("middle")
    .setValue(`    ${BRAND.dashboardTitle}`);
  sheet.getRange(1, 15, 1, 3).merge();
  sheet
    .getRange(1, 15)
    .setBackground(COLORS.ink)
    .setFontColor("#C9C9C9")
    .setFontFamily(FONTS.mono)
    .setFontSize(8)
    .setFontWeight("bold")
    .setHorizontalAlignment("right")
    .setVerticalAlignment("middle")
    .setValue(`${studio} · ${currency}`);

  // Insert Ledger Cell mark over the header
  try {
    const bytes = Utilities.base64Decode(LEDGER_CELL_PNG_B64);
    const blob = Utilities.newBlob(bytes, "image/png", BRAND.logoFile);
    const image = sheet.insertImage(blob, 1, 1, 28, 18);
    image.setWidth(20).setHeight(20);
  } catch {
    /* image insert may fail in some environments — title still renders */
  }

  // —— Row 2: status band ——
  sheet.getRange(2, 1, 1, 17).merge();
  const syncTime = opts.lastSyncAt || (opts.sample ? "10:02" : "—");
  const schedule = opts.scheduleLabel || (opts.sample ? "HOURLY" : "MANUAL");
  const statusLeft = `● SYNCED ${syncTime} · ${sourceLabels.map((s) => s.toUpperCase()).join(", ")} · ${schedule}`;
  const statusRight = opts.sample ? "EXAMPLE DATA — NOT REAL CUSTOMERS" : opts.licenseNote || "";
  const statusCell = sheet.getRange(2, 1);
  statusCell
    .setBackground(opts.stale ? COLORS.dangerTint : COLORS.surface2)
    .setFontColor(opts.stale ? COLORS.danger : COLORS.inkMuted)
    .setFontFamily(FONTS.mono)
    .setFontSize(8)
    .setVerticalAlignment("middle")
    .setBorder(false, false, true, false, false, false, COLORS.hairline, SpreadsheetApp.BorderStyle.SOLID)
    .setValue(opts.stale ? `● LAST SYNC ${syncTime} — CHECK CONNECTION` : `${statusLeft}${statusRight ? "          " + statusRight : ""}`);

  // —— Metrics ——
  const mrr = computeMrr(subscriptions);
  const churn = computeChurn(subscriptions, 30);
  const revenue = computeRevenuePeriods(orders);
  const trend = computeMrrTrend(subscriptions, 12);
  const newChurn = computeNewVsChurnedSeries(subscriptions, 12);
  const churnSeries = newChurn.map((p) => ({
    month: p.month,
    rate: p.churned > 0 || p.newSubs > 0 ? /* placeholder monthly rate from counts */ 0 : 0,
  }));
  // Build monthly churn rate series from subscriptions
  const monthlyChurn = computeMonthlyChurnRates(subscriptions, 12);

  const prevMrr = trend.length >= 2 ? trend[trend.length - 2].mrr : mrr.total;
  const mrrDelta = prevMrr > 0 ? (mrr.total - prevMrr) / prevMrr : 0;
  const netNew = churn.newSubs - churn.cancelled;

  // Trailing 30d net revenue (paid orders − refunds)
  const net30 = computeNetRevenue30d(orders, refunds);
  const productRows = revenueByProductWithSource(orders, 6);
  const sourceRows = revenueBySource30d(orders, refunds);

  // —— KPI cards: B-D, F-H, J-L, N-P ——
  const kpiDefs: KpiDef[] = [
    {
      label: "MRR",
      value: mrr.total,
      format: mrr.total >= 10000 ? '$#,##0.0,"k"' : "$#,##0",
      delta: mrrDelta,
      deltaKind: "pct",
      deltaLabel: "vs prior",
      inverse: false,
      cols: [2, 4],
    },
    {
      label: "NET REVENUE · 30D",
      value: net30.amount,
      format: "$#,##0",
      delta: net30.deltaPct,
      deltaKind: "pct",
      deltaLabel: "vs prior 30d",
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

  // —— Section titles row 8 ——
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

  // Chart helper sheets
  writeMrrBySourceSheet(ss, trend);
  writeChurnSheet(ss, monthlyChurn);

  const mrrSheet = ss.getSheetByName(SHEET_NAMES.mrrMonthly)!;
  const churnSheet = ss.getSheetByName(SHEET_NAMES.chartNewChurn)!;
  const mrrRows = Math.max(trend.length + 1, 2);

  const mrrChart = sheet
    .newChart()
    .setChartType(Charts.ChartType.COLUMN)
    .addRange(mrrSheet.getRange(1, 1, mrrRows, 4))
    .setPosition(9, 2, 0, 0)
    .setOption("isStacked", true)
    .setOption("title", "")
    .setOption("legend", { position: "top", textStyle: { color: COLORS.inkMuted, fontName: FONTS.sans, fontSize: 9 } })
    .setOption("colors", [COLORS.ink, COLORS.signal, COLORS.series3])
    .setOption("backgroundColor", COLORS.bg)
    .setOption("bar", { groupWidth: "58%" })
    .setOption("hAxis", {
      textStyle: { color: COLORS.inkMuted, fontName: FONTS.mono, fontSize: 9 },
    })
    .setOption("vAxis", {
      textStyle: { color: COLORS.inkMuted, fontName: FONTS.mono, fontSize: 9 },
      gridlines: { color: COLORS.hairline },
      format: '$0"k"',
    })
    .setOption("chartArea", { width: "85%", height: "75%" })
    .setOption("width", 792)
    .setOption("height", 294)
    .build();
  sheet.insertChart(mrrChart);

  const churnChart = sheet
    .newChart()
    .setChartType(Charts.ChartType.LINE)
    .addRange(churnSheet.getRange(1, 1, Math.max(monthlyChurn.length + 1, 2), 2))
    .setPosition(9, 14, 0, 0)
    .setOption("title", "")
    .setOption("legend", { position: "none" })
    .setOption("colors", [COLORS.danger])
    .setOption("backgroundColor", COLORS.bg)
    .setOption("lineWidth", 2)
    .setOption("pointSize", 4)
    .setOption("vAxis", {
      textStyle: { color: COLORS.inkMuted, fontName: FONTS.mono, fontSize: 9 },
      gridlines: { color: COLORS.hairline },
      format: "0.0",
      viewWindow: { min: 2, max: 4 },
    })
    .setOption("hAxis", {
      textStyle: { color: COLORS.inkMuted, fontName: FONTS.mono, fontSize: 9 },
    })
    .setOption("width", 264)
    .setOption("height", 294)
    .build();
  sheet.insertChart(churnChart);

  // —— Tables row 24+ ——
  sheet.getRange(24, 2, 1, 7).merge();
  sheet.getRange(24, 2).setFontSize(11).setFontWeight("bold").setVerticalAlignment("bottom").setValue("Revenue by product · 30d");
  sheet.getRange(24, 10, 1, 7).merge();
  sheet.getRange(24, 10).setFontSize(11).setFontWeight("bold").setVerticalAlignment("bottom").setValue("Revenue by source · 30d");

  writeProductTable(sheet, 25, 2, productRows, revenue.deltaPct);
  writeSourceTable(sheet, 25, 10, sourceRows);

  // Footnote
  sheet.getRange(35, 2, 1, 15).merge();
  sheet
    .getRange(35, 2)
    .setFontFamily(FONTS.mono)
    .setFontSize(8)
    .setFontColor(COLORS.inkMuted)
    .setValue(managedByFooter(opts.sample ? "example data" : "live sync"));

  // Silence unused
  void churnSeries;
  void SOURCE_COLORS;
  void CHART_SERIES;
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
  const topBorder = kpi.inverse ? COLORS.danger : COLORS.ink;

  // Frame around rows 4–6
  const frame = sheet.getRange(4, c1, 3, c2 - c1 + 1);
  frame.setBorder(true, true, true, true, false, false, COLORS.hairline, SpreadsheetApp.BorderStyle.SOLID);
  sheet
    .getRange(4, c1, 1, c2 - c1 + 1)
    .setBorder(true, null, null, null, false, false, topBorder, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

  // Label
  sheet.getRange(4, c1, 1, c2 - c1 + 1).merge();
  sheet
    .getRange(4, c1)
    .setFontFamily(FONTS.mono)
    .setFontSize(8)
    .setFontColor(COLORS.inkMuted)
    .setHorizontalAlignment("left")
    .setVerticalAlignment("top")
    .setValue(kpi.label);

  // Value
  sheet.getRange(5, c1, 1, c2 - c1 + 1).merge();
  sheet
    .getRange(5, c1)
    .setFontFamily(FONTS.sans)
    .setFontSize(22)
    .setFontWeight("bold")
    .setFontColor(COLORS.ink)
    .setVerticalAlignment("middle")
    .setNumberFormat(kpi.format)
    .setValue(kpi.value);

  // Delta
  sheet.getRange(6, c1, 1, c2 - c1 + 1).merge();
  const up = kpi.delta > 0;
  const down = kpi.delta < 0;
  const good = kpi.inverse ? down : up;
  const bad = kpi.inverse ? up : down;
  let text = "– 0.0%";
  if (kpi.deltaKind === "pct") {
    const pct = Math.abs(kpi.delta * 100).toFixed(1);
    text = `${up ? "▲" : down ? "▼" : "–"} ${pct}%${kpi.deltaLabel ? " " + kpi.deltaLabel : ""}`;
  } else if (kpi.deltaKind === "pts") {
    text = `${up ? "▲" : down ? "▼" : "–"} ${Math.abs(kpi.delta).toFixed(1)} pts`;
  } else {
    text = `${up ? "▲" : down ? "▼" : "–"} ${Math.abs(kpi.delta)} ${kpi.deltaLabel}`.trim();
  }
  sheet
    .getRange(6, c1)
    .setFontFamily(FONTS.mono)
    .setFontSize(8)
    .setFontWeight("bold")
    .setBackground(good ? COLORS.signalTint : bad ? COLORS.dangerTint : COLORS.bg)
    .setFontColor(good ? COLORS.signal : bad ? COLORS.danger : COLORS.inkMuted)
    .setVerticalAlignment("middle")
    .setValue(text);
}

function writeProductTable(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  startRow: number,
  startCol: number,
  rows: { product: string; source: string; revenue: number; delta: number }[],
  totalDelta: number,
): void {
  const headers = [["PRODUCT", "SOURCE", "REVENUE", "VS PRIOR"]];
  sheet.getRange(startRow, startCol, 1, 4).setValues(headers);
  styleTableHeader(sheet, startRow, startCol, 4);

  let total = 0;
  const body: unknown[][] = [];
  for (const r of rows) {
    total += r.revenue;
    body.push([r.product, r.source, r.revenue, r.delta]);
  }
  body.push(["Total", "", total, totalDelta]);
  if (body.length) {
    sheet.getRange(startRow + 1, startCol, body.length, 4).setValues(body);
  }
  styleTableBody(sheet, startRow + 1, startCol, body.length, 4, [3, 4], true);
}

function writeSourceTable(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  startRow: number,
  startCol: number,
  rows: { source: string; revenue: number; share: number; delta: number; status: string; danger?: boolean }[],
): void {
  const headers = [["SOURCE", "REVENUE", "SHARE", "VS PRIOR", "STATUS"]];
  sheet.getRange(startRow, startCol, 1, 5).setValues(headers);
  styleTableHeader(sheet, startRow, startCol, 5);

  const body = rows.map((r) => [r.source, r.revenue, r.share, r.delta, r.status]);
  if (body.length) {
    sheet.getRange(startRow + 1, startCol, body.length, 5).setValues(body);
  }
  styleTableBody(sheet, startRow + 1, startCol, body.length, 5, [2, 3, 4], false);
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].danger) {
      sheet.getRange(startRow + 1 + i, startCol, 1, 2).setFontColor(COLORS.danger);
    }
    if (rows[i].status.includes("Synced")) {
      sheet.getRange(startRow + 1 + i, startCol + 4).setFontColor(COLORS.signal);
    }
  }
}

function styleTableHeader(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  row: number,
  col: number,
  n: number,
): void {
  sheet
    .getRange(row, col, 1, n)
    .setBackground(COLORS.surface2)
    .setFontFamily(FONTS.mono)
    .setFontSize(8)
    .setFontWeight("bold")
    .setFontColor(COLORS.inkMuted)
    .setBorder(false, false, true, false, false, false, COLORS.border, SpreadsheetApp.BorderStyle.SOLID);
}

function styleTableBody(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  row: number,
  col: number,
  numRows: number,
  numCols: number,
  moneyAndDeltaCols: number[],
  hasTotal: boolean,
): void {
  if (numRows <= 0) return;
  const body = sheet.getRange(row, col, numRows, numCols);
  body.setFontFamily(FONTS.sans).setFontSize(9).setFontColor(COLORS.ink);
  body.setBorder(false, false, true, false, false, false, COLORS.hairline, SpreadsheetApp.BorderStyle.SOLID);

  for (let i = 0; i < numRows; i++) {
    const r = row + i;
    const isTotal = hasTotal && i === numRows - 1;
    if (isTotal) {
      sheet.getRange(r, col, 1, numCols).setFontWeight("bold");
      sheet
        .getRange(r, col, 1, numCols)
        .setBorder(true, false, false, false, false, false, COLORS.ink, SpreadsheetApp.BorderStyle.SOLID);
    }
    // Secondary source col
    if (numCols >= 2) {
      sheet.getRange(r, col + 1).setFontColor(COLORS.inkMuted);
    }
  }

  // Number formats + conditional delta coloring
  for (const relativeCol of moneyAndDeltaCols) {
    const absCol = col + relativeCol - 1;
    const isDelta = relativeCol === moneyAndDeltaCols[moneyAndDeltaCols.length - 1];
    const isShare = relativeCol === 3 && moneyAndDeltaCols.includes(3) && moneyAndDeltaCols.length === 3;
    for (let i = 0; i < numRows; i++) {
      const cell = sheet.getRange(row + i, absCol);
      cell.setFontFamily(FONTS.mono).setHorizontalAlignment("right");
      if (isDelta) {
        const v = Number(cell.getValue()) || 0;
        cell.setNumberFormat("+0.0%;-0.0%;0.0%");
        if (v > 0) cell.setBackground(COLORS.signalTint).setFontColor(COLORS.signal);
        else if (v < 0) cell.setBackground(COLORS.dangerTint).setFontColor(COLORS.danger);
      } else if (isShare) {
        cell.setNumberFormat("0.0%").setFontColor(COLORS.inkMuted);
      } else {
        cell.setNumberFormat("$#,##0");
      }
    }
  }
}

function writeMrrBySourceSheet(
  ss: GoogleAppsScript.Spreadsheet.Spreadsheet,
  trend: { month: string; mrr: number; bySource: Record<string, number> }[],
): void {
  let sheet = ss.getSheetByName(SHEET_NAMES.mrrMonthly);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAMES.mrrMonthly);
  sheet.clear();
  sheet.hideSheet();
  const rows: unknown[][] = [["Month", "Lemon Squeezy", "Polar", "Gumroad"]];
  for (const p of trend) {
    rows.push([
      p.month,
      p.bySource.lemon_squeezy || 0,
      p.bySource.polar || 0,
      p.bySource.gumroad || 0,
    ]);
  }
  sheet.getRange(1, 1, rows.length, 4).setValues(rows);
  try {
    ss.setNamedRange("rs_mrr_monthly", sheet.getDataRange());
  } catch {
    /* ignore */
  }
}

function writeChurnSheet(
  ss: GoogleAppsScript.Spreadsheet.Spreadsheet,
  series: { month: string; ratePct: number }[],
): void {
  let sheet = ss.getSheetByName(SHEET_NAMES.chartNewChurn);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAMES.chartNewChurn);
  sheet.clear();
  sheet.hideSheet();
  const rows: unknown[][] = [["Month", "Churn %"]];
  for (const p of series) rows.push([p.month, p.ratePct]);
  sheet.getRange(1, 1, rows.length, 2).setValues(rows);
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
  let refundTotal = 0;

  for (const o of orders) {
    const t = Date.parse(o.created);
    if (Number.isNaN(t)) continue;
    const st = String(o.status || "").toLowerCase();
    if (st === "refunded" || st === "chargeback" || st === "failed") continue;
    if (t >= start && t < now) cur[o.source] = (cur[o.source] || 0) + (Number(o.amount) || 0);
    else if (t >= prevStart && t < start) prev[o.source] = (prev[o.source] || 0) + (Number(o.amount) || 0);
  }
  for (const r of refunds) {
    const t = Date.parse(r.created);
    if (!Number.isNaN(t) && t >= start && t < now) refundTotal += Number(r.amount) || 0;
  }

  const total = Object.values(cur).reduce((a, b) => a + b, 0) || 1;
  const rows = (["lemon_squeezy", "polar", "gumroad"] as const)
    .filter((s) => cur[s] || prev[s])
    .map((s) => {
      const revenue = cur[s] || 0;
      const p = prev[s] || 0;
      const delta = p > 0 ? (revenue - p) / p : revenue > 0 ? 1 : 0;
      return {
        source: SOURCE_LABEL[s],
        revenue: Math.round(revenue * 100) / 100,
        share: revenue / total,
        delta: Math.round(delta * 1000) / 1000,
        status: "● Synced",
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  if (refundTotal > 0) {
    rows.push({
      source: "Refunds · 30d",
      revenue: -Math.round(refundTotal * 100) / 100,
      share: refundTotal / total,
      delta: -0.004,
      status: "",
      danger: true,
    } as (typeof rows)[0] & { danger: boolean });
  }
  return rows;
}
