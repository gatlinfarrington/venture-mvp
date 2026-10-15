import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { inflateRawSync } from "node:zlib";
import { afterEach, describe, expect, it } from "vitest";
import { templateCopyUrl, templateXlsxUrl } from "@/lib/brand";

const XLSX = join(process.cwd(), "public/revenuesheet-template.xlsx");
const CHECK_PY = join(process.cwd(), "scripts/check-template-xlsx.py");
const LIBRE_JS = join(process.cwd(), "scripts/check-template-xlsx-libreoffice.mjs");

/** Minimal ZIP local-file extractor for committed .xlsx fixtures (no extra deps). */
function readZipEntry(buf: Buffer, path: string): string {
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
    if (name !== path) continue;
    if (method === 0) return data.toString("utf8");
    if (method === 8) return inflateRawSync(data).toString("utf8");
    throw new Error(`Unsupported ZIP method ${method} for ${path}`);
  }
  throw new Error(`ZIP entry not found: ${path}`);
}

/** Formula text from <f>…</f>, decoding XML entities. */
function formulaBodies(xml: string): string[] {
  const out: string[] = [];
  for (const m of xml.matchAll(/<f(?:\s[^>]*)?>([\s\S]*?)<\/f>/g)) {
    out.push(
      m[1]!
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"'),
    );
  }
  return out;
}

describe("public revenuesheet-template.xlsx", () => {
  it("exists under public/", () => {
    expect(existsSync(XLSX)).toBe(true);
    expect(readFileSync(XLSX).byteLength).toBeGreaterThan(1000);
  });

  it("is a zip-based xlsx with the five expected sheets", () => {
    const buf = readFileSync(XLSX);
    expect(buf[0]).toBe(0x50);
    expect(buf[1]).toBe(0x4b);
    const workbook = readZipEntry(buf, "xl/workbook.xml");
    for (const name of ["Dashboard", "Orders", "Subscriptions", "Customers", "Refunds"]) {
      expect(workbook).toContain(`name="${name}"`);
    }
  });

  it("Orders header row includes Account (add-on shape)", () => {
    const orders = readZipEntry(readFileSync(XLSX), "xl/worksheets/sheet2.xml");
    expect(orders).toContain(">Order ID</t>");
    expect(orders).toContain(">Account</t>");
    expect(orders).toContain(">Amount (USD)</t>");
    // Headers only — no sample order rows
    expect(orders).not.toContain("EX-");
  });

  it("Dashboard keeps empty-data formulas", () => {
    const dash = readZipEntry(readFileSync(XLSX), "xl/worksheets/sheet1.xml");
    expect(dash).toContain("SUMIF(Subscriptions!");
    expect(dash).toContain("COUNTA(Orders!");
    expect(dash).toContain("COUNTIFS(Subscriptions!I2:I10000");
    expect(dash).toContain("CHURN · 30D");
    const formulas = formulaBodies(dash);
    expect(formulas.some((f) => f.startsWith("SUMIF(Subscriptions!"))).toBe(true);
    expect(formulas.some((f) => f.includes('Orders!H2:H10000,"paid"'))).toBe(true);
    expect(formulas.some((f) => f.startsWith("COUNTIF(Subscriptions!") && f.includes('"active"'))).toBe(
      true,
    );
    expect(formulas.some((f) => f.includes("COUNTIFS(Subscriptions!I2:I10000"))).toBe(true);
  });

  it("XML-escapes < and > inside every formula and inline string", () => {
    const buf = readFileSync(XLSX);
    for (const sheet of [
      "xl/worksheets/sheet1.xml",
      "xl/worksheets/sheet2.xml",
      "xl/worksheets/sheet3.xml",
      "xl/worksheets/sheet4.xml",
      "xl/worksheets/sheet5.xml",
    ]) {
      const xml = readZipEntry(buf, sheet);
      for (const m of xml.matchAll(/<(f|t)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/g)) {
        expect(m[2], `${sheet} <${m[1]}> has raw < or >`).not.toMatch(/[<>]/);
      }
    }
    const dash = readZipEntry(buf, "xl/worksheets/sheet1.xml");
    expect(dash).toContain('"&lt;&gt;"');
    expect(dash).toContain('"&gt;="');
  });

  it("Subscriptions date column is Canceled (US spelling, matches status)", () => {
    const subs = readZipEntry(readFileSync(XLSX), "xl/worksheets/sheet3.xml");
    expect(subs).toContain(">Canceled</t>");
    expect(subs).not.toContain(">Cancelled</t>");
  });

  it("rejects Google-Sheets-only open-ended ranges in every formula", () => {
    const buf = readFileSync(XLSX);
    const formulas: string[] = [];
    for (const sheet of [
      "xl/worksheets/sheet1.xml",
      "xl/worksheets/sheet2.xml",
      "xl/worksheets/sheet3.xml",
      "xl/worksheets/sheet4.xml",
      "xl/worksheets/sheet5.xml",
    ]) {
      formulas.push(...formulaBodies(readZipEntry(buf, sheet)));
    }
    expect(formulas.length).toBeGreaterThan(0);
    // Sheets allows A2:A; Excel requires A2:A10000 (or whole-column A:A).
    const openEnded = /(?:^|[^A-Z])(?:[A-Za-z0-9_]+!)?[A-Z]{1,3}\d+:[A-Z]{1,3}(?!\d)/;
    const bad = formulas.filter((f) => openEnded.test(f));
    expect(bad, `open-ended ranges:\n${bad.join("\n")}`).toEqual([]);
  });

  it("strict-parses every sheet XML and loads via openpyxl with KPI formulas", () => {
    const r = spawnSync("python3", [CHECK_PY], { encoding: "utf8" });
    expect(r.status, r.stderr || r.stdout).toBe(0);
    expect(r.stdout).toMatch(/MRR/);
    expect(r.stdout).toMatch(/CHURN/);
  });

  it("LibreOffice headless recalc has no Err values when soffice is available", () => {
    const r = spawnSync("node", [LIBRE_JS], { encoding: "utf8" });
    expect(r.status, r.stderr || r.stdout).toBe(0);
  });
});

describe("templateXlsxUrl / templateCopyUrl", () => {
  const prev = process.env.NEXT_PUBLIC_TEMPLATE_COPY_URL;

  afterEach(() => {
    if (prev === undefined) delete process.env.NEXT_PUBLIC_TEMPLATE_COPY_URL;
    else process.env.NEXT_PUBLIC_TEMPLATE_COPY_URL = prev;
  });

  it("defaults download to the public xlsx and leaves copy unset", () => {
    delete process.env.NEXT_PUBLIC_TEMPLATE_COPY_URL;
    expect(templateXlsxUrl()).toBe("/revenuesheet-template.xlsx");
    expect(templateCopyUrl()).toBeNull();
  });

  it("Sheets copy URL enables Make a copy without hijacking xlsx download", () => {
    process.env.NEXT_PUBLIC_TEMPLATE_COPY_URL =
      "https://docs.google.com/spreadsheets/d/abc/copy";
    expect(templateCopyUrl()).toContain("docs.google.com");
    expect(templateXlsxUrl()).toBe("/revenuesheet-template.xlsx");
  });

  it("xlsx TEMPLATE_COPY_URL overrides the download href only", () => {
    process.env.NEXT_PUBLIC_TEMPLATE_COPY_URL =
      "https://cdn.example.com/revenuesheet-template.xlsx";
    expect(templateXlsxUrl()).toBe(
      "https://cdn.example.com/revenuesheet-template.xlsx",
    );
    expect(templateCopyUrl()).toBeNull();
  });
});
