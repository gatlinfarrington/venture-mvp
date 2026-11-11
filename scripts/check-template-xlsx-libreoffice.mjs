#!/usr/bin/env node
/**
 * Optional LibreOffice headless recalc of public/revenuesheet-template.xlsx.
 * Skips (exit 0) when soffice/libreoffice is not on PATH — not required in CI.
 * Fails if recalc produces Err: values in Dashboard KPI cells.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, copyFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateRawSync } from "node:zlib";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const XLSX = join(ROOT, "public/revenuesheet-template.xlsx");

function findSoffice() {
  for (const bin of ["soffice", "libreoffice"]) {
    const which = spawnSync("which", [bin], { encoding: "utf8" });
    if (which.status === 0 && which.stdout.trim()) return which.stdout.trim();
  }
  return null;
}

function readZipEntry(buf, path) {
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
    throw new Error(`Unsupported ZIP method ${method}`);
  }
  throw new Error(`ZIP entry not found: ${path}`);
}

const soffice = findSoffice();
if (!soffice) {
  console.log("LibreOffice not installed — skipping headless recalc");
  process.exit(0);
}

if (!existsSync(XLSX)) {
  console.error(`missing ${XLSX}`);
  process.exit(1);
}

const dir = mkdtempSync(join(tmpdir(), "rs-xlsx-"));
try {
  const src = join(dir, "template.xlsx");
  copyFileSync(XLSX, src);
  const r = spawnSync(
    soffice,
    [
      "--headless",
      "--nologo",
      "--nofirststartwizard",
      "--calc",
      "--convert-to",
      "xlsx",
      "--outdir",
      dir,
      src,
    ],
    { encoding: "utf8", timeout: 120_000 },
  );
  if (r.status !== 0) {
    console.error(r.stdout || "");
    console.error(r.stderr || "");
    console.error("LibreOffice convert failed");
    process.exit(1);
  }
  const out = join(dir, "template.xlsx");
  const buf = readFileSync(out);
  const sheet = readZipEntry(buf, "xl/worksheets/sheet1.xml");
  // Cached values after recalc live in <v>; Err: shows up in value text.
  if (/Err:|\#VALUE!|\#REF!|\#NAME\?|\#DIV\/0!/i.test(sheet)) {
    console.error("LibreOffice recalc left error values in Dashboard");
    process.exit(1);
  }
  console.log("LibreOffice headless recalc OK (no Err values detected)");
} finally {
  rmSync(dir, { recursive: true, force: true });
}
