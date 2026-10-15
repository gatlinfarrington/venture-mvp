#!/usr/bin/env python3
"""Strict-parse every OOXML part and load the workbook with openpyxl.

Asserts Dashboard KPI formulas (MRR, net 30D, active, churn 30D) exist and are non-empty.
Exit 0 on success; non-zero on failure.
"""
from __future__ import annotations

import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
XLSX = ROOT / "public" / "revenuesheet-template.xlsx"


def main() -> int:
    if not XLSX.is_file():
        print(f"missing {XLSX}", file=sys.stderr)
        return 1

    with zipfile.ZipFile(XLSX) as zf:
        for name in zf.namelist():
            if not name.endswith(".xml"):
                continue
            raw = zf.read(name)
            try:
                ET.fromstring(raw)
            except ET.ParseError as exc:
                print(f"XML ParseError in {name}: {exc}", file=sys.stderr)
                return 1

    try:
        import openpyxl
    except ImportError:
        print("openpyxl is required: pip install openpyxl", file=sys.stderr)
        return 1

    wb = openpyxl.load_workbook(XLSX, data_only=False)
    if "Dashboard" not in wb.sheetnames:
        print(f"missing Dashboard sheet; got {wb.sheetnames}", file=sys.stderr)
        return 1

    dash = wb["Dashboard"]
    required = {
        "B5": "MRR",
        "F5": "NET REVENUE · 30D",
        "J5": "ACTIVE SUBSCRIPTIONS",
        "N5": "CHURN · 30D",
    }
    for coord, label in required.items():
        cell = dash[coord]
        val = cell.value
        if val is None or (isinstance(val, str) and not val.strip()):
            print(f"{coord} ({label}) formula missing/empty", file=sys.stderr)
            return 1
        text = str(val).lstrip("=")
        if not text:
            print(f"{coord} ({label}) formula empty after =", file=sys.stderr)
            return 1
        print(f"ok {coord} {label}: {text[:80]}")

    print("template xlsx XML + openpyxl load OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
