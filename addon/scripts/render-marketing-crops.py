#!/usr/bin/env python3
"""Render 4:3 @ 2x (2400×1800) marketing crops from marketing-crops.html."""
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

CROPS = [
    ("crop-connect", "how-connect-2x.png"),
    ("crop-orders", "how-orders-2x.png"),
    ("crop-dashboard", "how-dashboard-2x.png"),
]
W, H = 2400, 1800


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


def render_one(html_path: Path, shot: Path) -> None:
    profile = Path(tempfile.mkdtemp(prefix="chprof-"))
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
            f"--window-size={W},{H}",
            "--force-device-scale-factor=1",
            "--virtual-time-budget=5000",
            f"--screenshot={shot}",
            f"file://{html_path}",
        ]
        # Chrome often hangs after writing the screenshot; timeout 124 is OK if file exists.
        r = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if not shot.exists() or shot.stat().st_size < 1000:
            raise SystemExit(f"screenshot failed for {shot.name} (exit {r.returncode})")
    finally:
        shutil.rmtree(profile, ignore_errors=True)


def main() -> None:
    full = SRC.read_text()
    style = re.search(r"<style>([\s\S]*?)</style>", full).group(1)
    fonts = (
        '<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700'
        '&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />'
    )
    PUBLIC.mkdir(parents=True, exist_ok=True)
    ARTIFACTS.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="rs-crops-") as work_s:
        work = Path(work_s)
        for crop_id, filename in CROPS:
            body = extract_crop(full, crop_id)
            page = f"""<!DOCTYPE html><html><head><meta charset="utf-8"/>{fonts}
<style>{style}
body {{ margin: 0; background: #fff; }}
.crop {{ margin: 0 !important; width: {W}px; height: {H}px; }}
</style></head><body>{body}</body></html>"""
            html_path = work / f"{crop_id}.html"
            html_path.write_text(page)
            shot = work / filename
            print(f"rendering {filename}", flush=True)
            render_one(html_path, shot)
            im = Image.open(shot).convert("RGB")
            if im.size != (W, H):
                canvas = Image.new("RGB", (W, H), (255, 255, 255))
                canvas.paste(im.crop((0, 0, min(W, im.width), min(H, im.height))), (0, 0))
                im = canvas
            for dest in (PUBLIC, ARTIFACTS):
                out = dest / filename
                im.save(out, optimize=True)
                print(f"wrote {out} {im.size}")

        for dest in (PUBLIC, ARTIFACTS):
            shutil.copyfile(dest / "how-orders-2x.png", dest / "lands-orders-2x.png")
            print(f"wrote {dest / 'lands-orders-2x.png'}")


if __name__ == "__main__":
    main()
