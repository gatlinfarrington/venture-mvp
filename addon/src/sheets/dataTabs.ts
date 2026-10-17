import { a1ManagedNote } from "../lib/brand";
import { SHEET_NAMES } from "../lib/config";
import { COLORS, FONTS } from "../lib/tokens";
import type {
  ImportBundle,
  NormalizedCustomer,
  NormalizedOrder,
  NormalizedRefund,
  NormalizedSubscription,
} from "../importers/types";

const ORDER_HEADERS = [
  "Order ID",
  "Created",
  "Source",
  "Account",
  "Product",
  "Customer email",
  "Amount (USD)",
  "Status",
  "Country",
];

const SUB_HEADERS = [
  "Subscription ID",
  "Created",
  "Source",
  "Account",
  "Product",
  "Customer email",
  "MRR (USD)",
  "Status",
  "Canceled",
  "Interval",
  "Country",
];

const CUST_HEADERS = ["Customer ID", "Created", "Source", "Account", "Email", "Name", "Country"];
const REFUND_HEADERS = [
  "Refund ID",
  "Created",
  "Source",
  "Account",
  "Order ID",
  "Amount (USD)",
  "Status",
  "Country",
];

export function ensureDataSheets(ss: GoogleAppsScript.Spreadsheet.Spreadsheet): void {
  for (const name of [
    SHEET_NAMES.orders,
    SHEET_NAMES.subscriptions,
    SHEET_NAMES.customers,
    SHEET_NAMES.refunds,
    SHEET_NAMES.settings,
  ]) {
    if (!ss.getSheetByName(name)) ss.insertSheet(name);
  }
  const settings = ss.getSheetByName(SHEET_NAMES.settings)!;
  settings.setTabColor(COLORS.settingsTab);
}

export function writeImportBundle(
  ss: GoogleAppsScript.Spreadsheet.Spreadsheet,
  bundle: ImportBundle,
  opts: { merge?: boolean; currency?: string } = {},
): void {
  ensureDataSheets(ss);
  const currency = opts.currency || "USD";
  const amountHeader = `Amount (${currency})`;
  const mrrHeader = `MRR (${currency})`;

  writeTable(
    ss.getSheetByName(SHEET_NAMES.orders)!,
    ORDER_HEADERS.map((h) => (h.startsWith("Amount") ? amountHeader : h)),
    bundle.orders.map(orderRow),
    opts.merge ? "Order ID" : undefined,
  );
  writeTable(
    ss.getSheetByName(SHEET_NAMES.subscriptions)!,
    SUB_HEADERS.map((h) => (h.startsWith("MRR") ? mrrHeader : h)),
    bundle.subscriptions.map(subRow),
    opts.merge ? "Subscription ID" : undefined,
  );
  writeTable(
    ss.getSheetByName(SHEET_NAMES.customers)!,
    CUST_HEADERS,
    bundle.customers.map(custRow),
    opts.merge ? "Customer ID" : undefined,
  );
  writeTable(
    ss.getSheetByName(SHEET_NAMES.refunds)!,
    REFUND_HEADERS.map((h) => (h.startsWith("Amount") ? amountHeader : h)),
    bundle.refunds.map(refundRow),
    opts.merge ? "Refund ID" : undefined,
  );

  styleDataSheet(ss.getSheetByName(SHEET_NAMES.orders)!, [7]);
  styleDataSheet(ss.getSheetByName(SHEET_NAMES.subscriptions)!, [7]);
  styleDataSheet(ss.getSheetByName(SHEET_NAMES.customers)!, []);
  styleDataSheet(ss.getSheetByName(SHEET_NAMES.refunds)!, [6]);

  applyOrderStatusRules(ss.getSheetByName(SHEET_NAMES.orders)!);
  applySubStatusRules(ss.getSheetByName(SHEET_NAMES.subscriptions)!);

  try {
    ss.setNamedRange(
      "rs_orders",
      ss.getSheetByName(SHEET_NAMES.orders)!.getDataRange(),
    );
    ss.setNamedRange(
      "rs_subs",
      ss.getSheetByName(SHEET_NAMES.subscriptions)!.getDataRange(),
    );
    ss.setNamedRange(
      "rs_customers",
      ss.getSheetByName(SHEET_NAMES.customers)!.getDataRange(),
    );
  } catch {
    /* named range may already exist with different range */
  }
}

function storeLabelOf(row: { storeLabel?: string; storeId?: string }): string {
  return row.storeLabel || row.storeId || "Default";
}

function orderRow(o: NormalizedOrder): unknown[] {
  return [
    o.id,
    o.created,
    o.source,
    storeLabelOf(o),
    o.product,
    o.customerEmail,
    o.amount,
    o.status,
    o.country || "",
  ];
}
function subRow(s: NormalizedSubscription): unknown[] {
  return [
    s.id,
    s.created,
    s.source,
    storeLabelOf(s),
    s.product,
    s.customerEmail,
    s.mrr,
    s.status,
    s.cancelledAt || "",
    s.interval,
    s.country || "",
  ];
}
function custRow(c: NormalizedCustomer): unknown[] {
  return [c.id, c.created, c.source, storeLabelOf(c), c.email, c.name, c.country || ""];
}
function refundRow(r: NormalizedRefund): unknown[] {
  return [
    r.id,
    r.created,
    r.source,
    storeLabelOf(r),
    r.orderId,
    r.amount,
    r.status,
    r.country || "",
  ];
}

function writeTable(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  headers: string[],
  rows: unknown[][],
  mergeKeyHeader?: string,
): void {
  if (!mergeKeyHeader || sheet.getLastRow() < 1) {
    sheet.clear();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    if (rows.length) {
      sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    }
    annotateManaged(sheet);
    return;
  }

  // Merge in memory and write once (row-by-row setValues is ~1 API call per row and
  // blows the card's 30s budget on large stores).
  const existing = sheet.getDataRange().getValues();
  const existingHeaders = existing[0] as string[];
  const keyIdx = Math.max(0, existingHeaders.indexOf(mergeKeyHeader));
  const width = headers.length;
  const body: unknown[][] = existing.slice(1).filter((r) => r.some((c) => c !== "" && c != null)).map((r) => {
    const row = r.slice(0, width);
    while (row.length < width) row.push("");
    return row;
  });
  const map = new Map<string, number>();
  body.forEach((r, i) => map.set(String(r[keyIdx]), i));
  for (const row of rows) {
    const key = String(row[0]);
    const idx = map.get(key);
    if (idx != null) body[idx] = row;
    else {
      map.set(key, body.length);
      body.push(row);
    }
  }
  const oldRows = existing.length - 1;
  sheet.getRange(1, 1, 1, width).setValues([headers]);
  if (body.length) sheet.getRange(2, 1, body.length, width).setValues(body as (string | number | boolean | Date)[][]);
  if (oldRows > body.length) sheet.getRange(body.length + 2, 1, oldRows - body.length, Math.max(width, existingHeaders.length)).clearContent();
  annotateManaged(sheet);
}

function annotateManaged(sheet: GoogleAppsScript.Spreadsheet.Sheet): void {
  sheet.getRange("A1").setNote(a1ManagedNote());
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(1);
}

function styleDataSheet(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  moneyCols: number[],
): void {
  const range = sheet.getDataRange();
  const lastCol = range.getNumColumns();
  const lastRow = range.getNumRows();
  if (lastRow < 1) return;

  sheet.setHiddenGridlines(false);
  range.setFontFamily(FONTS.mono).setFontSize(9).setFontColor(COLORS.ink);
  sheet.setRowHeight(1, 28);
  if (lastRow > 1) sheet.setRowHeights(2, lastRow - 1, 21);

  const header = sheet.getRange(1, 1, 1, lastCol);
  header
    .setFontFamily(FONTS.mono)
    .setFontSize(8)
    .setFontWeight("bold")
    .setFontColor(COLORS.inkMuted)
    .setBackground(COLORS.surface2)
    .setBorder(false, false, true, false, false, false, COLORS.border, SpreadsheetApp.BorderStyle.SOLID);

  // Uppercase header labels visually via values already human-cased; keep as-is per SHEET-STYLE.
  if (lastRow > 1) {
    const body = sheet.getRange(2, 1, lastRow - 1, lastCol);
    body.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, false, false);
    // Override banding colors toward brand neutrals when possible
    try {
      const bandings = sheet.getBandings();
      for (const b of bandings) {
        b.setHeaderRowColor(COLORS.surface2);
        b.setFirstRowColor(COLORS.bg);
        b.setSecondRowColor("#FAFAFA");
      }
    } catch {
      /* ignore */
    }
  }

  for (const col of moneyCols) {
    if (lastRow > 1) {
      sheet.getRange(2, col, lastRow - 1, 1).setNumberFormat("$#,##0.00").setHorizontalAlignment("right");
    }
  }

  sheet.setColumnWidths(1, lastCol, 140);
  sheet.setColumnWidth(1, 160);
  sheet.setRowHeights(1, Math.max(lastRow, 1), 24);
}

function applyOrderStatusRules(sheet: GoogleAppsScript.Spreadsheet.Sheet): void {
  sheet.clearConditionalFormatRules();
  const lastRow = Math.max(sheet.getLastRow(), 2);
  // Status is column H after Store was inserted.
  const statusRange = sheet.getRange(`H2:H${lastRow}`);
  const refunded = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("refunded")
    .setBackground(COLORS.dangerTint)
    .setFontColor(COLORS.danger)
    .setRanges([statusRange])
    .build();
  const chargeback = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("chargeback")
    .setBackground(COLORS.dangerTint)
    .setFontColor(COLORS.danger)
    .setRanges([statusRange])
    .build();
  sheet.setConditionalFormatRules([refunded, chargeback]);
}

function applySubStatusRules(sheet: GoogleAppsScript.Spreadsheet.Sheet): void {
  const rules = sheet.getConditionalFormatRules();
  const lastRow = Math.max(sheet.getLastRow(), 2);
  // Status is column H after Store was inserted.
  const statusRange = sheet.getRange(`H2:H${lastRow}`);
  const pastDue = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("past_due")
    .setFontColor(COLORS.danger)
    .setBold(true)
    .setRanges([statusRange])
    .build();
  sheet.setConditionalFormatRules([...rules, pastDue]);
}

export function readOrders(ss: GoogleAppsScript.Spreadsheet.Spreadsheet): NormalizedOrder[] {
  const sheet = ss.getSheetByName(SHEET_NAMES.orders);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues();
  const headers = (values[0] as string[]).map(String);
  const hasStore = headers.includes("Account") || headers.includes("Store");
  return values
    .slice(1)
    .filter((r) => r[0])
    .map((r) => {
      if (hasStore) {
        return {
          id: String(r[0]),
          created: stringifyDate(r[1]),
          source: String(r[2]) as NormalizedOrder["source"],
          storeLabel: String(r[3] || "Default"),
          product: String(r[4]),
          customerEmail: String(r[5]),
          amount: Number(r[6]) || 0,
          currency: "USD",
          status: String(r[7]),
          rawId: String(r[0]),
          country: r[8] ? String(r[8]) : undefined,
        };
      }
      // Legacy columns (no Store)
      return {
        id: String(r[0]),
        created: stringifyDate(r[1]),
        source: String(r[2]) as NormalizedOrder["source"],
        storeLabel: "Default",
        product: String(r[3]),
        customerEmail: String(r[4]),
        amount: Number(r[5]) || 0,
        currency: "USD",
        status: String(r[6]),
        rawId: String(r[0]),
        country: r[7] ? String(r[7]) : undefined,
      };
    });
}

export function readSubscriptions(
  ss: GoogleAppsScript.Spreadsheet.Spreadsheet,
): NormalizedSubscription[] {
  const sheet = ss.getSheetByName(SHEET_NAMES.subscriptions);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues();
  const headers = (values[0] as string[]).map(String);
  const hasStore = headers.includes("Account") || headers.includes("Store");
  return values
    .slice(1)
    .filter((r) => r[0])
    .map((r) => {
      if (hasStore) {
        return {
          id: String(r[0]),
          created: stringifyDate(r[1]),
          source: String(r[2]) as NormalizedSubscription["source"],
          storeLabel: String(r[3] || "Default"),
          product: String(r[4]),
          customerEmail: String(r[5]),
          mrr: Number(r[6]) || 0,
          currency: "USD",
          status: String(r[7]),
          cancelledAt: r[8] ? stringifyDate(r[8]) : null,
          interval: (String(r[9]) || "month") as NormalizedSubscription["interval"],
          rawId: String(r[0]),
          country: r[10] ? String(r[10]) : undefined,
        };
      }
      return {
        id: String(r[0]),
        created: stringifyDate(r[1]),
        source: String(r[2]) as NormalizedSubscription["source"],
        storeLabel: "Default",
        product: String(r[3]),
        customerEmail: String(r[4]),
        mrr: Number(r[5]) || 0,
        currency: "USD",
        status: String(r[6]),
        cancelledAt: r[7] ? stringifyDate(r[7]) : null,
        interval: (String(r[8]) || "month") as NormalizedSubscription["interval"],
        rawId: String(r[0]),
        country: r[9] ? String(r[9]) : undefined,
      };
    });
}

export function readRefunds(ss: GoogleAppsScript.Spreadsheet.Spreadsheet): NormalizedRefund[] {
  const sheet = ss.getSheetByName(SHEET_NAMES.refunds);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues();
  const headers = (values[0] as string[]).map(String);
  const hasStore = headers.includes("Account") || headers.includes("Store");
  return values
    .slice(1)
    .filter((r) => r[0])
    .map((r) => {
      if (hasStore) {
        return {
          id: String(r[0]),
          created: stringifyDate(r[1]),
          source: String(r[2]) as NormalizedRefund["source"],
          storeLabel: String(r[3] || "Default"),
          orderId: String(r[4]),
          amount: Number(r[5]) || 0,
          currency: "USD",
          status: String(r[6]),
          rawId: String(r[0]),
          country: r[7] ? String(r[7]) : undefined,
        };
      }
      return {
        id: String(r[0]),
        created: stringifyDate(r[1]),
        source: String(r[2]) as NormalizedRefund["source"],
        storeLabel: "Default",
        orderId: String(r[3]),
        amount: Number(r[4]) || 0,
        currency: "USD",
        status: String(r[5]),
        rawId: String(r[0]),
        country: r[6] ? String(r[6]) : undefined,
      };
    });
}

function stringifyDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value || "");
}

/** Data tab names that carry an Account column at index 3 (D). */
const ACCOUNT_TABS = [SHEET_NAMES.orders, SHEET_NAMES.subscriptions, SHEET_NAMES.customers, SHEET_NAMES.refunds];

/** Rename an account's label on existing rows (so breakdowns don't split after a rename). */
export function relabelAccountRows(
  ss: GoogleAppsScript.Spreadsheet.Spreadsheet,
  source: string,
  oldLabel: string,
  newLabel: string,
): number {
  let n = 0;
  for (const name of ACCOUNT_TABS) {
    const sheet = ss.getSheetByName(name);
    if (!sheet || sheet.getLastRow() < 2) continue;
    const range = sheet.getRange(2, 3, sheet.getLastRow() - 1, 2); // Source, Account
    const values = range.getValues();
    let changed = false;
    for (const row of values) {
      if (String(row[0]) === source && String(row[1] || "Default") === oldLabel) {
        row[1] = newLabel;
        changed = true;
        n++;
      }
    }
    if (changed) range.setValues(values);
  }
  return n;
}

/** Delete every row that belongs to one account (after the user removes it). */
export function deleteAccountRows(
  ss: GoogleAppsScript.Spreadsheet.Spreadsheet,
  source: string,
  label: string,
): number {
  let n = 0;
  for (const name of ACCOUNT_TABS) {
    const sheet = ss.getSheetByName(name);
    if (!sheet || sheet.getLastRow() < 2) continue;
    const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, Math.max(4, sheet.getLastColumn())).getValues();
    const keep = values.filter((r) => !(String(r[2]) === source && String(r[3] || "Default") === label));
    const removed = values.length - keep.length;
    if (!removed) continue;
    n += removed;
    sheet.getRange(2, 1, values.length, values[0].length).clearContent();
    if (keep.length) sheet.getRange(2, 1, keep.length, values[0].length).setValues(keep);
  }
  return n;
}
