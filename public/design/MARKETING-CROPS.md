# Marketing crops

Rendered text ≥11 CSS px. ≤24px blank on any side. Cropped to content; displayed near 1:1.

## How it works

| Step | Asset | Capture | Display |
|---|---|---|---|
| 01 Connect | `/design/how-connect-2x.png` | Sidebar 300 CSS × content @ DPR 2 (≈600px wide), 16px pad | max-width 300px, same on phone |
| 02 Backfill | `/design/how-backfill-2x.png` | Sidebar 300×300 CSS @ DPR 2; progress + 6 rows | max-width 300px, same on phone |
| 03 Dashboard | `/design/how-dashboard-2x.png` | ≈336×240 CSS @ DPR 2 (672×480) | max-width 300px, same on phone |

## What lands

| Viewport | Asset | Capture |
|---|---|---|
| Desktop | `/design/lands-orders-2x.png` | 5 cols (Order ID, Created, Source, Product, Amount), 10 rows + header + tabs, 600 CSS @ DPR 2 |
| Phone | `/design/lands-orders-phone-2x.png` | 3 cols (Order ID, Source, Amount), 8 rows, 295 CSS @ DPR 2 |

## Source / regenerate

- HTML: `addon/scripts/marketing-crops.html` (matches add-on `Sidebar.html` tokens + demo data)
- Renderer: `python3 addon/scripts/render-marketing-crops.py`
