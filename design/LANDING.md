# RevenueSheet — Landing page design notes
System: RevenueSheet tokens (`tokens.css`, adapted from Monolith). Preview: `landing-hero.png`. Principles: left-aligned editorial, product as hero, one accent with meaning, facts in mono. See REFERENCES.md.

## Grid & rhythm
12 columns, max 1200px content (1440 canvas), 40px gutters, 24px mobile. Section padding 128px desktop / 72px mobile (`space-16`×2 / ×1.125). Within-group 8–16px, between groups 24–32px. One `display` (56px desktop, 44 mobile) per page; section titles `h2` 28px.

## Sections (in order) — copy hierarchy
1. **Nav** — wordmark left; "Pricing", "Docs", "Changelog"; primary pill "Install free" (`--c-ink`). Height 72, hairline bottom on scroll only.
2. **Hero** (cols 1–5 text, 6–12 product frame bleeding right) — eyebrow (mono, muted): "Google Sheets add-on" · H1 display: "All your stores, in a sheet you own." · Lede (body-lg, muted, ≤ 56ch): "Lemon Squeezy, Polar, Gumroad and Stripe revenue, synced into Google Sheets on a schedule, with an MRR dashboard built for you." · Source pills (outlined) · Primary "Install for Google Sheets", secondary "See the dashboard" · Caption "Dashboard shows example data". Product frame: `radius-md`, hairline, single `shadow-card`, surface-2 backdrop.
3. **How it works** — 3 numbered steps in a row, mono numerals `01 02 03`: Connect (paste an API key) → Backfill (full history, not just new rows) → Dashboard (MRR, churn, revenue by product, auto-built). Each with a cropped real UI frame, not icons.
4. **What lands in your sheet** — split: left list of tabs (Orders, Subscriptions, Customers, Refunds, Dashboard) with one-line descriptions; right an Orders tab screenshot. Mono for column names.
5. **Why a sheet** — 3-column text grid, no cards: "You own the data" / "Use your own formulas" / "No new dashboard to learn". Body copy, hairline top border per column.
6. **Comparison** — honest table vs "Zapier/Make append-only" and "CSV templates": backfill, dashboard, multi-store, schedule. Checks as `signal` text "Yes"/muted "No" (not emoji).
7. **Pricing** — 3 columns (Free / $9 / $19, annual 2 months free) as a table-like layout; middle column marked with a 1px ink border, not a gradient or "most popular" ribbon. Prices are final (no “est.”).
8. **FAQ** — accordion, hairline separators: data storage/privacy, which scopes, Lemon Squeezy→Stripe transition, refunds, cancel.
9. **Final CTA** — left-aligned h2 "Your revenue, finally in one place." + primary button.
10. **Footer** — dense link columns (Product, Sources, Guides/SEO pages, Legal), small mono "© 2026". One wry line allowed.

## Component → token map
| Component | Tokens |
|---|---|
| Primary button | bg `--c-ink`, text `--c-ink-inverse`, `--radius-pill`, h48, label 15/500, focus 2px ink ring + 2px offset |
| Secondary button | `--c-surface` + 1px `--c-border`, text ink |
| Source pill | 1px `--c-border`, `--radius-pill`, label 14/500 (text only — no third-party logos without permission) |
| Eyebrow | JetBrains Mono 11/500, 0.08em, uppercase, `--c-ink-muted` |
| Product frame | `--radius-md`, 1px `--c-hairline`, `--shadow-card` (the only shadow on the page) |
| KPI/delta | positive `--c-signal`, negative `--c-danger`, mono 12/500 |
| Table | header `--c-surface-2`, mono uppercase 11 muted, rows hairline, numerals right-aligned mono |
| Status dot | 7px `--c-signal` + text label always |
| Dark band (optional, Final CTA) | `--c-dark-bg`, text `--c-dark-ink`, accent `--c-signal-on-dark` |
Motion: `--dur-base` `--ease-out` for hover/focus; product frame fades up 8px once on load; honor reduced motion.

## Copy rules
Specific > clever. Name the sources, the mechanism, the outcome. No invented metrics, logos, testimonials, or install counts. All demo numbers labeled "Example data". Sentence case everywhere.

## Anti-patterns checklist (PR review gate for directory eng)
Every landing/listing PR must pass all items; reviewers cite the item number.
- [ ] A1 No purple/blue/rainbow gradients; no gradient text. Only token colors.
- [ ] A2 No emoji used as icons or bullets. Icons (if any) are one set, one stroke width (1.5px), 16/20px.
- [ ] A3 No glassmorphism/backdrop blur except nav-on-scroll (max one instance).
- [ ] A4 Hero is left-aligned on the grid; no centered-everything stacks. Centering allowed only for single-line captions.
- [ ] A5 No stock 3D blobs, abstract spheres, AI-generated illustrations, or fake mockup devices. Imagery = real product UI.
- [ ] A6 Max one shadow token used on the page (`--shadow-card` on the hero frame). No cards-inside-cards; prefer hairlines and whitespace.
- [ ] A7 Radius only from tokens (6/12/22/pill). No mixed arbitrary radii.
- [ ] A8 Spacing only from tokens; no arbitrary px values in CSS (lint: no raw px in margin/padding/gap outside tokens).
- [ ] A9 Type only from the scale; weights 400/500/600 only; one `display` per page; mono reserved for facts/eyebrows.
- [ ] A10 Copy is specific: no "supercharge", "unlock", "seamless", "revolutionize", "all-in-one", "game-changer", lorem/placeholder text.
- [ ] A11 No fake social proof: no invented customer logos, counts, ratings or testimonials. Example data is labeled.
- [ ] A12 Accent `--c-signal` only for meaning (status, positive delta, brand mark). Not for decoration or section backgrounds.
- [ ] A13 Contrast AA verified for every new pair (update contrast-report.md); focus ring visible on all interactive elements; tap targets ≥ 44px.
- [ ] A14 Numbers use tabular mono and right alignment in tables; currency formatting consistent.
- [ ] A15 Responsive check at 390, 768, 1440: no orphaned words in H1 (fix copy/measure, don't shrink), no horizontal scroll.
- [ ] A16 Motion ≤ 320ms, purposeful, reduced-motion respected; no parallax or scroll-jacking.
- [ ] A17 No Google/third-party logos or trademark misuse (Marketplace branding rules); source names as text.
- [ ] A18 Lighthouse: performance ≥ 90, accessibility = 100, no layout shift from font loading (`font-display: swap` + size-adjust).
- [ ] A19 No U+2014 em dash in `app/` or `content/` visible copy, titles, or demo data (rewrite with period, comma, colon, or parentheses; product names use middle dot).
