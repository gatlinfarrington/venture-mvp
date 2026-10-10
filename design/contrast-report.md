# RevenueSheet contrast report
WCAG AA (4.5:1 text, 3:1 UI/large). Based on Monolith tokens plus RevenueSheet additions.

| Pair | FG | BG | Ratio | Need | Use | Result |
|---|---|---|---|---|---|---|
| `ink` on `bg` | #0D0D0D | #FFFFFF | 19.44:1 | 4.5:1 | Body text | PASS |
| `ink-muted` on `bg` | #5C5C5C | #FFFFFF | 6.69:1 | 4.5:1 | Secondary text | PASS |
| `ink-muted` on `surface-2` | #5C5C5C | #F2F2F2 | 5.97:1 | 4.5:1 | Muted on header band | PASS |
| `ink` on `surface-2` | #0D0D0D | #F2F2F2 | 17.36:1 | 4.5:1 | Header text on band | PASS |
| `ink-inverse` on `ink` | #FFFFFF | #0D0D0D | 19.44:1 | 4.5:1 | Primary button | PASS |
| `ink-inverse` on `signal` | #FFFFFF | #0A7A55 | 5.35:1 | 4.5:1 | Icon glyph / signal button | PASS |
| `signal` on `bg` | #0A7A55 | #FFFFFF | 5.35:1 | 4.5:1 | Positive delta text | PASS |
| `signal` on `signal-tint` | #0A7A55 | #E7F3EE | 4.70:1 | 4.5:1 | Positive cell | PASS |
| `danger` on `bg` | #B42318 | #FFFFFF | 6.57:1 | 4.5:1 | Negative delta text | PASS |
| `danger` on `danger-tint` | #B42318 | #FBEAE8 | 5.65:1 | 4.5:1 | Negative cell | PASS |
| `border` on `bg` | #8C8C8C | #FFFFFF | 3.36:1 | 3:1 | Input border (UI) | PASS |
| `series-3` on `bg` | #7A7A7A | #FFFFFF | 4.29:1 | 3:1 | Chart series 3 (UI) | PASS |
| `signal` on `bg` | #0A7A55 | #FFFFFF | 5.35:1 | 3:1 | Chart series 2 (UI) | PASS |
| `dark-ink` on `dark-bg` | #F4F4F5 | #0A0A0B | 18.00:1 | 4.5:1 | Dark text | PASS |
| `signal-on-dark` on `dark-bg` | #3FBF8C | #0A0A0B | 8.52:1 | 4.5:1 | Signal text on dark | PASS |
| `ink-muted` on `signal-tint` | #5C5C5C | #E7F3EE | 5.88:1 | 4.5:1 | Muted on positive fill | PASS |

Notes: chart series are additionally separated by marker/dash style and direct labels (never color alone). `hairline` is decorative only.
RevenueSheet additions vs Monolith: signal-tint, danger, danger-tint, series-3, dark-bg, dark-ink, signal-on-dark.
## Additions (dashboard spec, motion, alt green)
| Pair | FG | BG | Ratio | Need | Use | Result |
|---|---|---|---|---|---|---|
| Header band secondary text | #C9C9C9 | #0D0D0D | 11.74:1 | 4.5:1 | Header band secondary text | PASS |
| Header band title | #FFFFFF | #0D0D0D | 19.44:1 | 4.5:1 | Header band title | PASS |
| Alt green text | #0E6B5C | #FFFFFF | 6.41:1 | 4.5:1 | Alt green text | PASS |
| Alt green on alt tint | #0E6B5C | #E6F1EF | 5.55:1 | 4.5:1 | Alt green on alt tint | PASS |
| Alt green on dark | #46C2AE | #0A0A0B | 9.04:1 | 4.5:1 | Alt green on dark | PASS |
| Status dot on band (UI) | #0A7A55 | #F2F2F2 | 4.78:1 | 3:1 | Status dot on band (UI) | PASS |
| Logo accent on dark | #3FBF8C | #0A0A0B | 8.52:1 | 3:1 | Logo accent on dark | PASS |
| Muted on negative fill | #5C5C5C | #FBEAE8 | 5.74:1 | 4.5:1 | Muted on negative fill | PASS |
| Primary button hover | #FFFFFF | #262626 | 15.13:1 | 4.5:1 | Primary button hover | PASS |
