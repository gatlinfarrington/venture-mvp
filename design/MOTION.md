# RevenueSheet: motion
Motion explains what changed and where data went. It never decorates. Tokens live in `tokens.css` (Motion block) and `tokens.json` → `motion`. Prototype: `landing-hero-demo.html` (still frame: `landing-hero-demo.png`).

## Principles
1. **Causal**: things move from where they came from to where they land (store → row → total).
2. **Quick and quiet**: UI feedback finishes in ≤ 220ms; nothing loops forever except the "syncing" pulse while a sync is actually running.
3. **One overshoot budget**: only press/hover springs bounce (~6%). Content never bounces.
4. **Transform and opacity only**: no animating layout properties (except the bar height in the demo, which is a contained element).
5. **Reduced motion is a first-class design**, not a fallback (see below).

## Easing
| Token | Value | Use |
|---|---|---|
| `--ease-standard` | cubic-bezier(.2,0,0,1) | color, border, small state changes |
| `--ease-out` | cubic-bezier(.16,1,.3,1) | entrances, reveals, counters |
| `--ease-in` | cubic-bezier(.4,0,1,1) | exits (always shorter than the entrance) |
| `--ease-in-out` | cubic-bezier(.65,0,.35,1) | elements traveling across the screen (sync packets) |
| `--ease-spring` | CSS `linear()` approximation with a 6% overshoot | button and pill hover/press |

## Durations
`--dur-instant` 80ms (press down) · `--dur-fast` 140ms (hover color) · `--dur-base` 220ms (hover lift, toggles) · `--dur-slow` 360ms (row insert, bar grow) · `--dur-reveal` 560ms (section entrance) · `--dur-hero` 3200ms (one hero sync cycle). Exits run at 70% of the matching entrance.

## Springs (buttons and pills)
- CSS: `transition: transform var(--dur-base) var(--ease-spring)`. Hover is `translateY(-1px)`; press is `scale(.97)` at `--dur-instant`, and release springs back.
- JS (motion.dev / Framer Motion): press `{type:"spring", stiffness:520, damping:30, mass:0.6}`, hover `{stiffness:380, damping:26, mass:0.7}`. That's about 6% overshoot and settles in under 250ms.
- Chips: on toggle the background crossfades at `--dur-fast`; no scale (avoids jitter in rows of chips).
- Never: rotate, glow, color-shift gradients, or shadows that grow on hover. Only primary buttons darken (`#262626`).

## Scroll and entrance reveals
- Each section reveals once at 15% visible (IntersectionObserver, `once:true`): opacity 0→1, translateY 12px→0, `--dur-reveal` `--ease-out`.
- Stagger children by `--stagger` (60ms), max 5 items; anything beyond appears with the 5th.
- Screenshots and product frames: opacity plus 12px only, no scale or zoom-in.
- No parallax, no scroll-jacking, no pinned scroll scenes.

## Hero demo: storyboard (one 3.2s cycle, plays 14 orders, then rests)
| t | Frame |
|---|---|
| 0.0s | Page reveal: eyebrow → H1 → lede → CTAs → stage, staggered 60ms. Stores show grey dots, sheet shows MRR $4,180 (example). |
| 0.6s | Lemon Squeezy dot turns signal green with a soft pulse ring. An order "packet" pill (`+$29`) travels along a curved path (`offset-path`, 900ms, `--ease-in-out`) from the store card into the sheet. |
| 1.4s | Packet lands: a new row slides in at the top (8px, `--dur-slow`), its cells flash `signal-tint` then fade (1.2s). The MRR counter tweens up (ease-out quart, 700ms, tabular numerals so width never jitters). The current-month green bar grows. |
| 1.0–6.5s | Polar and Gumroad join and orders alternate every 420ms; the table keeps 9 rows and old rows drop off the bottom. |
| end | Everything rests with all three stores live (steady pulse). A "Replay" button restarts. The caption "Example data · no real customers" is always visible. |

## Reduced motion (`prefers-reduced-motion: reduce`)
- Tokens collapse: durations go to 0, reveal distance to 0, press scale to 1.
- Hero: no packets and no pulse. The final state renders immediately (all rows, final MRR), and "Replay" just refreshes the data.
- Reveals: content is visible at load. Counters jump straight to the final value.
- Hover still changes color (that isn't motion).

## Implementation notes
- Use `font-variant-numeric: tabular-nums` on every animated number.
- Pause the hero loop when the tab is hidden (`visibilitychange`) and when it's off-screen.
- Under 768px: the stage stacks under the copy, store cards shrink to chips, and packets travel vertically.
- Budget: hero JS under 3 KB, no animation library needed on the landing page.
