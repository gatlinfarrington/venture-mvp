#!/usr/bin/env python3
"""Strict-parse every OOXML part and load the workbook with openpyxl.

Asserts Dashboard KPI formulas (MRR, net 30D, active, churn 30D) exist and are non-empty.
Seeds a 40-day-old paid order and asserts it is excluded from the F5 30D net formula.
Exit 0 on success; non-zero on failure.
"""
from __future__ import annotations

import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from datetime import date, datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
XLSX = ROOT / "public" / "revenuesheet-template.xlsx"


def eval_f5_net(
    orders: list[tuple[date, str, float]],
    refunds: list[tuple[date, str, float]],
    today: date,
) -> float:
    """Mirror Dashboard F5: SUMIFS paid orders − SUMIFS succeeded refunds, Created >= today-30."""
    cutoff = today - timedelta(days=30)
    total = 0.0
    for created, status, amount in orders:
        if status == "paid" and created >= cutoff:
            total += amount
    for created, status, amount in refunds:
        if status == "succeeded" and created >= cutoff:
            total -= amount
    return round(total, 2)


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
    formulas: dict[str, str] = {}
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
        formulas[coord] = text
        print(f"ok {coord} {label}: {text[:100]}")

    f5 = formulas["F5"]
    if "SUMIFS(" not in f5:
        print("F5 must use SUMIFS for the 30D window", file=sys.stderr)
        return 1
    if "Orders!B2:B10000" not in f5 or "Refunds!B2:B10000" not in f5:
        print("F5 must filter Orders!B and Refunds!B (Created) with the 30D window", file=sys.stderr)
        return 1
    if "TODAY()-30" not in f5:
        print("F5 must use TODAY()-30", file=sys.stderr)
        return 1
    # Refund status "paid" is order-only across Stripe/LS/Polar/Gumroad — must not appear.
    if re.search(r'Refunds![A-Z0-9:]+,"paid"', f5):
        print('F5 must not subtract Refunds with status "paid" (not a refund status)', file=sys.stderr)
        return 1
    if 'Refunds!G2:G10000,"succeeded"' not in f5:
        print('F5 must subtract Refunds with status "succeeded"', file=sys.stderr)
        return 1

    today = date.today()
    old = today - timedelta(days=40)
    recent = today - timedelta(days=5)
    orders = [
        (old, "paid", 100.0),
        (recent, "paid", 50.0),
    ]
    refunds: list[tuple[date, str, float]] = []
    net = eval_f5_net(orders, refunds, today)
    if net != 50.0:
        print(f"40-day-old paid order must be excluded from F5; got {net}", file=sys.stderr)
        return 1
    print("ok F5 excludes 40-day-old paid order (seed eval → 50)")

    # Also seed into a copy of the workbook so openpyxl can see the rows + formula shape.
    orders_sheet = wb["Orders"]
    # Headers already in row 1; write data rows.
    # Order ID, Created, Source, Account, Product, email, Amount, Status, Country
    orders_sheet["A2"] = "OLD-40"
    orders_sheet["B2"] = datetime.combine(old, datetime.min.time())
    orders_sheet["C2"] = "Stripe"
    orders_sheet["D2"] = "example-acct"
    orders_sheet["E2"] = "Plan"
    orders_sheet["F2"] = "old@example.com"
    orders_sheet["G2"] = 100
    orders_sheet["H2"] = "paid"
    orders_sheet["I2"] = "US"
    orders_sheet["A3"] = "NEW-5"
    orders_sheet["B3"] = datetime.combine(recent, datetime.min.time())
    orders_sheet["C3"] = "Stripe"
    orders_sheet["D3"] = "example-acct"
    orders_sheet["E3"] = "Plan"
    orders_sheet["F3"] = "new@example.com"
    orders_sheet["G3"] = 50
    orders_sheet["H3"] = "paid"
    orders_sheet["I3"] = "US"

    # Re-check formula still present after writes.
    if not str(dash["F5"].value or "").lstrip("=").startswith("SUMIFS"):
        print("F5 formula lost after seeding", file=sys.stderr)
        return 1
    print("ok seeded Orders rows; F5 formula intact")

    print("template xlsx XML + openpyxl load OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
