#!/usr/bin/env node
/**
 * Rebuild public/revenuesheet-template.xlsx with Excel-safe bounded ranges
 * and XML-escaped formula / string text (openpyxl + Excel reject raw <>).
 *
 * Usage: node scripts/build-revenuesheet-template.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { deflateRawSync, inflateRawSync } from "node:zlib";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public/revenuesheet-template.xlsx");
const ROW = 10000;

/** Escape &, <, > for XML text nodes (formula bodies and inlineStr). */
export function escapeXml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function readZipEntries(buf) {
  const out = [];
  let offset = 0;
  while (offset + 30 < buf.length) {
    if (buf.readUInt32LE(offset) !== 0x04034b50) break;
    const method = buf.readUInt16LE(offset + 8);
    const compSize = buf.readUInt32LE(offset + 18);
    const nameLen = buf.readUInt16LE(offset + 26);
    const extraLen = buf.readUInt16LE(offset + 28);
    const name = buf.subarray(offset + 30, offset + 30 + nameLen).toString("utf8");
    const dataStart = offset + 30 + nameLen + extraLen;
    const data = buf.subarray(dataStart, dataStart + compSize);
    offset = dataStart + compSize;
    const raw =
      method === 0 ? Buffer.from(data) : method === 8 ? inflateRawSync(data) : null;
    if (!raw) throw new Error(`Unsupported ZIP method ${method} for ${name}`);
    out.push({ name, raw });
  }
  return out;
}

function buildZip(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const { name, raw } of files) {
    const nameBuf = Buffer.from(name, "utf8");
    const crc = crc32(raw);
    const compressed = deflateRawSync(raw);
    const useStore = compressed.length >= raw.length;
    const payload = useStore ? raw : compressed;
    const method = useStore ? 0 : 8;
    const local = Buffer.alloc(30 + nameBuf.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(payload.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    nameBuf.copy(local, 30);
    locals.push(Buffer.concat([local, payload]));
    const central = Buffer.alloc(46 + nameBuf.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(payload.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    nameBuf.copy(central, 46);
    centrals.push(central);
    offset += local.length + payload.length;
  }
  const centralDir = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDir.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...locals, centralDir, end]);
}

function f(formula) {
  return `<f>${escapeXml(formula)}</f>`;
}

function cellRef(ref, style, formula) {
  const s = style != null ? ` s="${style}"` : "";
  return `<c r="${ref}"${s}>${f(formula)}<v /></c>`;
}

/** Dashboard sheet — blank template KPIs with Excel-safe bounded ranges. */
function dashboardSheet() {
  const mrr = `SUMIF(Subscriptions!H2:H${ROW},"active",Subscriptions!G2:G${ROW})`;
  const net = `SUMIF(Orders!H2:H${ROW},"paid",Orders!G2:G${ROW})-SUMIF(Refunds!G2:G${ROW},"succeeded",Refunds!F2:F${ROW})-SUMIF(Refunds!G2:G${ROW},"paid",Refunds!F2:F${ROW})`;
  const active = `COUNTIF(Subscriptions!H2:H${ROW},"active")`;
  // 30d logo churn via Canceled date column I (non-blank in trailing window).
  const churn = `IFERROR(COUNTIFS(Subscriptions!I2:I${ROW},">="&TODAY()-30,Subscriptions!I2:I${ROW},"<>")/(COUNTIF(Subscriptions!H2:H${ROW},"active")+COUNTIFS(Subscriptions!I2:I${ROW},">="&TODAY()-30,Subscriptions!I2:I${ROW},"<>")),0)`;
  const ordersNote = `COUNTA(Orders!A2:A${ROW})&" orders (all time)"`;
  const pastDue = `COUNTIF(Subscriptions!H2:H${ROW},"past_due")&" past due"`;
  const countOrders = `COUNTA(Orders!A2:A${ROW})`;
  const countCustomers = `COUNTA(Customers!A2:A${ROW})`;
  const countRefunds = `COUNTA(Refunds!A2:A${ROW})`;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><outlinePr summaryBelow="1" summaryRight="1" /><pageSetUpPr /></sheetPr><dimension ref="B1:N14" /><sheetViews><sheetView workbookViewId="0"><selection activeCell="A1" sqref="A1" /></sheetView></sheetViews><sheetFormatPr baseColWidth="8" defaultRowHeight="15" /><cols><col width="28" customWidth="1" min="2" max="2" /><col width="28" customWidth="1" min="6" max="6" /><col width="24" customWidth="1" min="10" max="10" /><col width="18" customWidth="1" min="14" max="14" /></cols><sheetData>
<row r="1"><c r="B1" s="1" t="inlineStr"><is><t>${escapeXml("Revenue dashboard")}</t></is></c></row>
<row r="2"><c r="B2" s="2" t="inlineStr"><is><t>${escapeXml("Blank template · formulas stay at zero until rows are added")}</t></is></c></row>
<row r="4"><c r="B4" s="3" t="inlineStr"><is><t>MRR</t></is></c><c r="F4" s="3" t="inlineStr"><is><t>${escapeXml("NET REVENUE · 30D")}</t></is></c><c r="J4" s="3" t="inlineStr"><is><t>ACTIVE SUBSCRIPTIONS</t></is></c><c r="N4" s="3" t="inlineStr"><is><t>${escapeXml("CHURN · 30D")}</t></is></c></row>
<row r="5">${cellRef("B5", 4, mrr)}${cellRef("F5", 4, net)}${cellRef("J5", 5, active)}${cellRef("N5", 6, churn)}</row>
<row r="6"><c r="B6" s="2" t="inlineStr"><is><t>Active subscriptions only</t></is></c><c r="F6" s="2">${f(ordersNote)}<v /></c><c r="J6" s="2">${f(pastDue)}<v /></c><c r="N6" s="2" t="inlineStr"><is><t>${escapeXml("Canceled in last 30 days ÷ (active + canceled in window)")}</t></is></c></row>
<row r="8"><c r="B8" s="3" t="inlineStr"><is><t>Orders</t></is></c><c r="F8" s="3" t="inlineStr"><is><t>Customers</t></is></c><c r="J8" s="3" t="inlineStr"><is><t>Refunds</t></is></c></row>
<row r="9">${cellRef("B9", 5, countOrders)}${cellRef("F9", 5, countCustomers)}${cellRef("J9", 5, countRefunds)}</row>
<row r="10"><c r="B10" s="2" t="inlineStr"><is><t>row count</t></is></c><c r="F10" s="2" t="inlineStr"><is><t>row count</t></is></c><c r="J10" s="2" t="inlineStr"><is><t>row count</t></is></c></row>
<row r="12"><c r="B12" s="3" t="inlineStr"><is><t>How to use</t></is></c></row>
<row r="13"><c r="B13" s="2" t="inlineStr"><is><t>${escapeXml("Keep these tab names and header rows. The add-on will write into the same columns.")}</t></is></c></row>
<row r="14"><c r="B14" s="2" t="inlineStr"><is><t>${escapeXml("This file is a blank layout preview — not an installable add-on.")}</t></is></c></row>
</sheetData><pageMargins left="0.75" right="0.75" top="1" bottom="1" header="0.5" footer="0.5" /></worksheet>`;
}

function headerSheet(headers) {
  const cells = headers
    .map((h, i) => {
      const col = String.fromCharCode(65 + i);
      return `<c r="${col}1" t="inlineStr"><is><t>${escapeXml(h)}</t></is></c>`;
    })
    .join("");
  const lastCol = String.fromCharCode(65 + headers.length - 1);
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr /><dimension ref="A1:${lastCol}1" /><sheetViews><sheetView workbookViewId="0" /></sheetViews><sheetFormatPr baseColWidth="8" defaultRowHeight="15" /><sheetData><row r="1">${cells}</row></sheetData><pageMargins left="0.75" right="0.75" top="1" bottom="1" header="0.5" footer="0.5" /></worksheet>`;
}

function main() {
  // Prefer patching an existing package skeleton so styles/theme stay intact.
  const existing = readFileSync(OUT);
  const entries = readZipEntries(existing);
  const byName = Object.fromEntries(entries.map((e) => [e.name, e]));

  byName["xl/worksheets/sheet1.xml"].raw = Buffer.from(dashboardSheet(), "utf8");
  byName["xl/worksheets/sheet2.xml"].raw = Buffer.from(
    headerSheet([
      "Order ID",
      "Created",
      "Source",
      "Account",
      "Product",
      "Customer email",
      "Amount (USD)",
      "Status",
      "Country",
    ]),
    "utf8",
  );
  byName["xl/worksheets/sheet3.xml"].raw = Buffer.from(
    headerSheet([
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
    ]),
    "utf8",
  );
  byName["xl/worksheets/sheet4.xml"].raw = Buffer.from(
    headerSheet([
      "Customer ID",
      "Created",
      "Source",
      "Account",
      "Email",
      "Name",
      "Country",
    ]),
    "utf8",
  );
  byName["xl/worksheets/sheet5.xml"].raw = Buffer.from(
    headerSheet([
      "Refund ID",
      "Created",
      "Source",
      "Account",
      "Order ID",
      "Amount (USD)",
      "Status",
      "Country",
    ]),
    "utf8",
  );

  // Guard: no raw < or > left inside <f>…</f> or <t>…</t> text.
  for (const sheet of [
    "xl/worksheets/sheet1.xml",
    "xl/worksheets/sheet2.xml",
    "xl/worksheets/sheet3.xml",
    "xl/worksheets/sheet4.xml",
    "xl/worksheets/sheet5.xml",
  ]) {
    const xml = byName[sheet].raw.toString("utf8");
    for (const m of xml.matchAll(/<(f|t)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/g)) {
      const body = m[2];
      if (/[<>]/.test(body)) {
        throw new Error(`${sheet}: unescaped < or > in <${m[1]}>: ${body.slice(0, 120)}`);
      }
    }
  }

  const out = buildZip(entries.map((e) => byName[e.name]));
  writeFileSync(OUT, out);
  console.log(`Wrote ${OUT} (${out.length} bytes)`);
}

main();
