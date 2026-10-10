#!/usr/bin/env python3
"""Render marketing crops at DPR 2 from marketing-crops.html (content-sized)."""
from __future__ import annotations

import re
import shutil
import subprocess
import tempfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = Path(__file__).resolve().parent / "marketing-crops.html"
PUBLIC = ROOT / "public" / "design"
ARTIFACTS = Path("/opt/cursor/artifacts")

# id → filename, css_w, css_h (None = content height; capture window tall then trim)
CROPS = [
    ("crop-connect", "how-connect-2x.png", 300, None),
    ("crop-backfill", "how-backfill-2x.png", 300, 300),
    ("crop-dashboard", "how-dashboard-2x.png", 336, 240),
    ("crop-orders", "lands-orders-2x.png", 600, None),
    ("crop-orders-phone", "lands-orders-phone-2x.png", 295, None),
]

PAD_CSS = 16
DPR = 2


def extract_crop(html: str, crop_id: str) -> str:
    start = html.find(f'id="{crop_id}"')
    if start < 0:
        raise SystemExit(f"missing #{crop_id}")
    open_div = html.rfind("<div", 0, start)
    i = open_div
    depth = 0
    while i < len(html):
        next_open = html.find("<div", i)
        next_close = html.find("</div>", i)
        if next_close < 0:
            break
        if next_open >= 0 and next_open < next_close:
            depth += 1
            i = next_open + 4
        else:
            depth -= 1
            i = next_close + 6
            if depth == 0:
                return html[open_div:i]
    raise SystemExit(f"unbalanced div for #{crop_id}")


def render_one(html_path: Path, shot: Path, css_w: int, css_h: int) -> None:
    profile = Path(tempfile.mkdtemp(prefix="chprof-"))
    # Window size is in CSS pixels; DPR 2 yields 2× bitmap.
    try:
        cmd = [
            "timeout",
            "45",
            "google-chrome",
            "--headless=new",
            "--disable-gpu",
            "--no-sandbox",
            "--hide-scrollbars",
            "--disable-extensions",
            "--disable-background-networking",
            "--disable-sync",
            "--disable-default-apps",
            "--no-first-run",
            f"--user-data-dir={profile}",
            f"--window-size={css_w},{css_h}",
            f"--force-device-scale-factor={DPR}",
            "--virtual-time-budget=5000",
            f"--screenshot={shot}",
            f"file://{html_path}",
        ]
        r = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if not shot.exists() or shot.stat().st_size < 500:
            raise SystemExit(f"screenshot failed for {shot.name} (exit {r.returncode})")
    finally:
        shutil.rmtree(profile, ignore_errors=True)


def content_bbox(im: Image.Image, bg=(255, 255, 255), tol: int = 8) -> tuple[int, int, int, int]:
    """Tight bbox of non-background pixels."""
    px = im.load()
    w, h = im.size
    min_x, min_y, max_x, max_y = w, h, 0, 0
    found = False
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y][:3]
            if abs(r - bg[0]) > tol or abs(g - bg[1]) > tol or abs(b - bg[2]) > tol:
                found = True
                if x < min_x:
                    min_x = x
                if y < min_y:
                    min_y = y
                if x > max_x:
                    max_x = x
                if y > max_y:
                    max_y = y
    if not found:
        return (0, 0, w, h)
    return (min_x, min_y, max_x + 1, max_y + 1)


def trim_pad(im: Image.Image, pad_px: int) -> Image.Image:
    box = content_bbox(im)
    cropped = im.crop(box)
    out = Image.new("RGB", (cropped.width + pad_px * 2, cropped.height + pad_px * 2), (255, 255, 255))
    out.paste(cropped, (pad_px, pad_px))
    return out


def main() -> None:
    full = SRC.read_text()
    style = re.search(r"<style>([\s\S]*?)</style>", full).group(1)
    fonts = (
        '<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600'
        '&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />'
    )
    PUBLIC.mkdir(parents=True, exist_ok=True)
    ARTIFACTS.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="rs-crops-") as work_s:
        work = Path(work_s)
        for crop_id, filename, css_w, css_h in CROPS:
            body = extract_crop(full, crop_id)
            # Capture window: fixed crops use exact size; content crops use tall window.
            win_h = css_h if css_h is not None else 1200
            page = f"""<!DOCTYPE html><html><head><meta charset="utf-8"/>{fonts}
<style>{style}
html, body {{ margin: 0; padding: 0; background: #fff; }}
.crop {{ margin: 0 !important; }}
</style></head><body>
{body}
</body></html>"""
            html_path = work / f"{crop_id}.html"
            html_path.write_text(page)
            shot = work / filename
            print(f"rendering {filename} ({css_w}×{win_h} CSS @ {DPR}x)", flush=True)
            render_one(html_path, shot, css_w, win_h)
            im = Image.open(shot).convert("RGB")
            # Trim chrome/blank; keep ≤24px blank (we use 16 CSS = 32 device px pad).
            pad = PAD_CSS * DPR
            if css_h is None:
                im = trim_pad(im, pad)
            else:
                # Fixed-size crops: ensure exact DPR size, then light trim if excess blank.
                target = (css_w * DPR, css_h * DPR)
                if im.size != target:
                    canvas = Image.new("RGB", target, (255, 255, 255))
                    canvas.paste(im.crop((0, 0, min(target[0], im.width), min(target[1], im.height))), (0, 0))
                    im = canvas
            dest = PUBLIC / filename
            im.save(dest, "PNG", optimize=True)
            shutil.copy2(dest, ARTIFACTS / filename)
            print(f"  → {dest} {im.size[0]}×{im.size[1]}", flush=True)

    # Remove unused legacy assets
    for stale in (
        "how-orders-2x.png",
        "how-connect-phone-2x.png",
        "how-backfill-phone-2x.png",
        "how-dashboard-phone-2x.png",
    ):
        p = PUBLIC / stale
        if p.exists():
            p.unlink()
            print(f"deleted {stale}", flush=True)


if __name__ == "__main__":
    main()
