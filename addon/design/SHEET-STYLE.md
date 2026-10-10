# RevenueSheet: Sheets dashboard spec (build target)
Target render: `sheet-dashboard-target.png` (source `sheet-dashboard-target.html`, generator `sheetmock.py`). Everything below can be set with Apps Script: `setColumnWidth`, `setRowHeight`, `merge`, `setBackground`, `setFontFamily/Size/Weight/Color`, `setBorder`, `setNumberFormat`, `EmbeddedChartBuilder`, `ConditionalFormatRuleBuilder`, `setTabColor`, `setHiddenGridlines`. Template and demo copies must say "Example data". Never ship real customer numbers.

## Brand green
- **Current: `#0A7A55`** (signal). 5.3:1 on white, 4.8:1 on its tint `#E7F3EE`.
- **Alternative: `#0E6B5C`** (bluer teal, 6.4:1 on white). Use it if Marketplace review or user feedback finds the current green too close to Google Sheets' own green; pair it with tint `#E6F1EF` and `#46C2AE` on dark. It's included in tokens.json as `signal-alt`.

## Fonts (available in Sheets)
Sheets can use any Google Font by name (Format → Font → More fonts; Apps Script `setFontFamily("Inter Tight")`).
| Role | Font | Fallback if blocked | Size (pt) | Weight |
|---|---|---|---|---|
| Header band title | Inter Tight | Inter, then Roboto | 15 | bold |
| Section titles | Inter Tight | Inter | 11 | bold |
| KPI value | Inter Tight | Inter | 22 | bold |
| KPI label, status band, table headers | JetBrains Mono | Roboto Mono | 8 | bold for headers, regular for status |
| Table body text | Inter Tight | Inter | 9 | regular |
| Table numbers, IDs, dates | JetBrains Mono | Roboto Mono | 9 | regular |
| Footnote | JetBrains Mono | Roboto Mono | 8 | regular |
Apply Inter Tight 9 to the whole tab first, then override.

## Grid: columns (px) and merges
Gridlines are hidden on the Dashboard tab.
| Col | Width | Role |
|---|---|---|
| A | 24 | left gutter |
| B C D | 88 each (card = 264) | KPI 1 |
| E | 16 | spacer |
| F G H | 88 each | KPI 2 |
| I | 16 | spacer |
| J K L | 88 each | KPI 3 |
| M | 16 | spacer |
| N O P | 88 each | KPI 4 |
| Q | 24 | right gutter |
The total width of 1152px fits a 1280px laptop window with the sidebar closed.

## Rows (px)
| Row | Height | Content |
|---|---|---|
| 1 | 56 | **Header band**: merge A1:Q1, fill `#0D0D0D`, Inter Tight 15 bold white "Revenue dashboard", right-aligned mono 8 `#C9C9C9` "EXAMPLE STUDIO · USD" in P1 |
| 2 | 28 | **Status band**: merge A2:Q2, fill `#F2F2F2`, mono 8 `#5C5C5C`: "● SYNCED 10:02 · LEMON SQUEEZY, POLAR, GUMROAD · HOURLY", bottom border `#E6E6E6` |
| 3 | 20 | spacer |
| 4 | 22 | KPI label (merge B4:D4, F4:H4, J4:L4, N4:P4), mono 8 `#5C5C5C`, top-left aligned |
| 5 | 40 | KPI value (merge per card), Inter Tight 22 bold `#0D0D0D`, vertically centered |
| 6 | 22 | KPI delta (merge per card), mono 8 on its tint (see conditional formatting) |
| 7 | 24 | spacer |
| 8 | 28 | section titles: "MRR by source · last 12 months" (B8, merged to L8), "Churn · monthly" (N8:P8), bottom-aligned |
| 9–22 | 21 each | chart area (the charts float over these rows) |
| 23 | 24 | spacer |
| 24 | 28 | section titles: "Revenue by product · 30d" (B24:H24), "Revenue by source · 30d" (J24:P24) |
| 25–33 | 21 each | tables: header row 25, then data and a total row |
| 34 | 24 | spacer |
| 35 | 20 | footnote (merge B35:P35) |
KPI card frame: a 1px `#E6E6E6` border around B4:D6 (and the other three cards), plus a 2px top border in `#0D0D0D`. Use `#B42318` instead when the metric is bad when it rises (churn, refunds).

## Fills (hex)
| Element | Fill | Text |
|---|---|---|
| Page | `#FFFFFF` | `#0D0D0D` |
| Header band | `#0D0D0D` | `#FFFFFF`; accent text `#C9C9C9` |
| Status band | `#F2F2F2` | `#5C5C5C`; dot `#0A7A55` |
| Table header | `#F2F2F2`, bottom border `#8C8C8C` | `#5C5C5C` mono 8 bold, uppercase |
| Table rows | `#FFFFFF`, bottom border `#E6E6E6` | `#0D0D0D`; secondary columns `#5C5C5C` |
| Total row | `#FFFFFF`, top border `#0D0D0D` | bold |
| Positive cell | `#E7F3EE` | `#0A7A55` |
| Negative cell | `#FBEAE8` | `#B42318` |
| Stale/error | `#FBEAE8` | `#B42318` bold |
All pairs pass AA (see contrast-report.md; `#C9C9C9` on `#0D0D0D` is 11.7:1). Never use Sheets' alternating-color presets.

## Number formats
| Use | Format |
|---|---|
| KPI currency | `$#,##0` |
| Large KPI (10k and up) | `$#,##0.0,"k"` |
| Order amounts | `$#,##0.00` |
| Negative currency | `$#,##0.00;-$#,##0.00` (red comes from conditional formatting, not the format) |
| Delta % | `"▲ "0.0%;"▼ "0.0%;"– "0.0%` |
| Delta in points | `"▲ "0.0" pts";"▼ "0.0" pts"` |
| Share | `0.0%` |
| Counts | `#,##0` |
| Dates on data tabs | `yyyy-mm-dd` |
| Timestamps | `yyyy-mm-dd hh:mm` |
| Chart axis months | `mmm` |
Numbers are right-aligned, text left-aligned.

## Charts
- **MRR by source**: stacked column chart anchored at B9, sized 792×294px (B through L, rows 9–22).
  - Series colors: Lemon Squeezy `#0D0D0D`, Polar `#0A7A55`, Gumroad `#7A7A7A`. A 4th source uses `#B5B5B5`.
  - Bar gap 42%, background `#FFFFFF`, no chart border, chart title off (the title lives in row 8).
  - Legend top-right in Inter Tight 9 `#5C5C5C`. Axis labels in JetBrains Mono 9 `#5C5C5C`, gridlines `#E6E6E6`, vertical axis format `$0"k"`.
  - Put a data label on the last bar only (bold, `#0D0D0D`).
- **Churn**: line chart at N9, sized 264×294px. Line `#B42318` at 2px, point size 4, vertical axis 2–4% with format `0.0`, no legend.
- **Revenue by product** (optional chart version): horizontal bars in single color `#0D0D0D`, sorted descending.
- Never: 3D, gradients, pie charts with more than 4 slices, dual axes, or default Google chart colors.

## Conditional formatting (no more than 6 rules per tab)
1. Delta columns (KPI row 6, "vs prior" columns): value above 0 → `#E7F3EE` fill with `#0A7A55` text; below 0 → `#FBEAE8` fill with `#B42318` text.
2. Inverse metrics (churn, refunds): flip the colors. A rise is red.
3. Orders → Status: "refunded" or "chargeback" → negative fill. "paid" gets no color, so the common case stays quiet.
4. Subscriptions → Status "past_due": `#B42318` bold text only.
5. Status band: if the last sync is older than twice the schedule, use `#FBEAE8` fill and `#B42318` text. Apps Script also changes the copy to "Last sync 3h ago, check connection".
6. Raw data tabs: color scales are not allowed.

## Tab colors and order
| Tab | Color |
|---|---|
| Dashboard | `#0A7A55` |
| Orders | `#0D0D0D` |
| Subscriptions | `#0D0D0D` |
| Customers | `#0D0D0D` |
| Refunds | `#B42318` |
| Settings | `#8C8C8C` |
Hidden `_raw_lemonsqueezy`, `_raw_polar` and `_raw_gumroad` tabs hold the source payloads.

## Data tabs
- Freeze row 1 and column A. The header row is 28px with a `#F2F2F2` fill and mono 8 bold `#5C5C5C` text. Body rows are 21px.
- Gridlines stay on. Optional banding: `#FFFFFF` / `#FAFAFA`.
- Use human header labels with units, e.g. "Amount (USD)".
- Synced ranges get warning-only protection. A1 carries the note "Managed by RevenueSheet: edits are overwritten on sync. Add your own columns to the right."
- Named ranges: `rs_orders`, `rs_subs`, `rs_customers`, `rs_mrr_monthly`.

## v2 light revision (Oct 10, 2026, launch pack)
Gatlin rejected dark boxes, so `launch/revenuesheet-dashboard-template.xlsx` ships these overrides. They take precedence over the sections above:
- **Header band:** white fill, Inter Tight 15 bold ink title, 2px (`medium`) ink bottom rule across A1:Q1. The right-hand meta sits in M1:Q1, mono 8 `#5C5C5C`. No black band.
- **Chart series:** Lemon Squeezy `#0D0D0D`, Polar `#5C5C5C`, Gumroad `#8C8C8C`, with 1px white separators between stacks. Green is no longer a series color, because green is reserved for meaning (positive deltas, "Synced").
- **Tab colors:** Dashboard `#0D0D0D` (was green), the data tabs `#0D0D0D`, Refunds `#B42318`, Settings and MRR monthly `#8C8C8C`.
- **Chart data:** lives on a visible `MRR monthly` tab (named range `rs_mrr_monthly`). The MRR KPI and the MoM delta are formulas against it.

## Design review follow-up (Growth default, no green fills)
Takes precedence over Fills / Conditional formatting / Charts above when they conflict:
- **Template default:** Growth (ARR / LTV / refunds / cohorts / country). Classic remains an opt-in.
- **No green (or red) cell fills** for Δ or Synced. Δ is text only: green `#0A7A55` ▲ when positive, `#B42318` ▼ when negative, grey `#5C5C5C` for 0%. Synced is a green ● with ink label, no fill.
- **KPI top rules:** ink `#0D0D0D` by default; red only when the headline value itself is negative (Churn is not red-topped just for being “inverse”).
- **Refund mini-KPIs:** ink top rule; red text only if the number is negative.
- **Cohort heat:** greyscale ramp (darker grey = higher retention). White text on dark cells where AA needs it. No green/red heat.
- **MRR goal:** one contiguous ink bar on a grey track (not segmented blocks). Label uses thousands separators (`$11,709 / $15,000`).
- **Churn chart:** ink line; y-axis / label treatment matches the MRR chart (`minValue: 0`, no fixed 2–4% window).
- **Status line:** list only connected sources (Stripe only when connected). Demo sample lists Lemon Squeezy, Polar, Gumroad.
- **Growth layout:** Growth metrics + tables use the same 4-column KPI grid (B–D / F–H / J–L / N–P).
- **Copy:** no U+2014 em dash in demo / status strings; use middle dot ` · ` (or a period / comma).
