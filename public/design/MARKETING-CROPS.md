# Marketing crops (site batch)

All frames have a **16px inner margin** and whole-word text (no mid-word clip / ellipsis).
Demo copy uses ` · ` instead of em dashes.

## How it works

| Step | Desktop (4:3 @ 2x · 2400×1800) | Phone (3:4 @ 2x · 1200×1600) |
|---|---|---|
| 01 Connect | `/design/how-connect-2x.png` | `/design/how-connect-phone-2x.png` |
| 02 Backfill | `/design/how-backfill-2x.png` | `/design/how-backfill-phone-2x.png` |
| 03 Dashboard | `/design/how-dashboard-2x.png` | `/design/how-dashboard-phone-2x.png` |

Step 02 is the **sidebar mid-backfill** (progress + fading rows), not the Orders sheet.

## What lands

| Section | Desktop | Phone |
|---|---|---|
| Orders tab | `/design/lands-orders-2x.png` | `/design/lands-orders-phone-2x.png` |

`how-orders-2x.png` is kept as an alias of `lands-orders-2x.png` for old refs.

## Source / regenerate

- HTML: `addon/scripts/marketing-crops.html`
- Renderer: `python3 addon/scripts/render-marketing-crops.py`
