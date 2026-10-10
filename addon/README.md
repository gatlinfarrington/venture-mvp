# RevenueSheet — Google Sheets add-on

Clasp-ready Apps Script (TypeScript) that syncs Lemon Squeezy, Polar, and Gumroad into your spreadsheet and builds an MRR / churn dashboard.

Brand name is swappable from a single constant: [`src/lib/brand.ts`](src/lib/brand.ts) (`BRAND.name`). The placeholder logo is the **Ledger Cell** mark (`design/ledger-cell-mark*.png`, logo-v2 concept 3).

Design target (launch v2): [`design/revenuesheet-dashboard-template-preview.png`](design/revenuesheet-dashboard-template-preview.png) · [`design/revenuesheet-dashboard-template.xlsx`](design/revenuesheet-dashboard-template.xlsx) · [`design/SHEET-STYLE.md`](design/SHEET-STYLE.md). Marketplace listing assets: [`design/marketplace/`](design/marketplace/).

## Prerequisites

- Node 20+
- A Google account
- [clasp](https://github.com/google/clasp) (`npm i -g @google/clasp`)
- A Google Cloud project (for OAuth / Marketplace)

## Setup

```bash
cd addon
npm install
npm test
npm run build
clasp login
```

1. Create a new Apps Script project bound to a Sheet **or** a standalone script for the Marketplace add-on.
2. Put the script ID in [`.clasp.json`](.clasp.json) (`scriptId`).
3. Push:

```bash
npm run push
```

4. In the Apps Script editor → **Project Settings** → set script properties:
   - `LICENSE_API_BASE` — web app origin (e.g. `https://venture-mvp.vercel.app`)
   - `LICENSE_API_SECRET` — optional; sent as `x-license-secret` when the site sets `LICENSE_API_SECRET`

   The add-on calls `POST {LICENSE_API_BASE}/api/license/verify` with `{ "key": "…" }` and expects `{ "valid": true, "tier": "free"|"pro"|"business", "limits": { "maxSources", "scheduledRefresh" } }`.

## Local scripts

| Command | Purpose |
|---|---|
| `npm test` | Unit tests (MRR / churn / ARPU + importer mappers with mocked fetch) |
| `npm run build` | Bundle `src/` → `dist/Code.js` + `Sidebar.html` + `appsscript.json` |
| `npm run push` | Build then `clasp push` |
| `npm run typecheck` | `tsc --noEmit` |

## OAuth scopes (non-sensitive)

Declared in `src/appsscript.json`:

- `spreadsheets.currentonly` — only the open spreadsheet
- `script.external_request` — Lemon Squeezy / Polar / Gumroad / license API
- `script.scriptapp` — time-driven refresh triggers
- `script.container.ui` — sidebar / menu

## Features

- **Sidebar** — API keys + license; MRR goal; template picker (classic / growth); schedule cadence; CSV paste; opt-in weekly digest. Keys in **User Properties**.
- **Importers** — Lemon Squeezy, Polar, Gumroad, Stripe (restricted read-only key), CSV fallback with column mapping. Resumable chunked backfill (`pageToken` / resource). Gumroad uses `page_key`. Intervals (quarterly / biannual / biennial / yearly / …) → monthly MRR.
- **Metrics** — MRR (active-only by default), ARR, LTV, churn, cohort retention, refunds, top products, revenue by country, MRR goal progress bar.
- **Schedule** — hourly / 6h / daily / weekly (paid tier); finishes incomplete backfills.
- **Weekly digest** — opt-in MailApp email. Needs sensitive scope `script.send_mail` (**not** in default `appsscript.json`); document and re-auth to enable.
- **Dashboard** — `SHEET-STYLE.md` launch v2 (white header + ink rule, greyscale charts, green only for positive deltas / Synced). Growth template adds ARR/LTV/cohorts/country panels.
- **License** — free = 1 source, manual refresh; unreachable API degrades gracefully to free limits.
- **Demo mode** — **Load example data** fills SAMPLE rows clearly labeled for screenshots.

### Scope changes (Phase 2)

| Scope | Status |
|---|---|
| Existing non-sensitive scopes | Unchanged in default manifest |
| `https://www.googleapis.com/auth/script.send_mail` | **Optional / sensitive** — required only if weekly digest is enabled; not shipped in default `oauthScopes` |

## Marketplace publish checklist (owner)

These steps need a human with the Google Cloud / Workspace Marketplace publisher account:

1. **GCP project** — create/link the Apps Script project; enable Google Sheets API + Apps Script API.
2. **OAuth consent screen** — External; app name from `BRAND.name`; scopes listed above; add homepage, privacy, and terms URLs from the Next.js site.
3. **OAuth verification** — because `script.external_request` and Sheets scopes are used in a public add-on; prepare demo video + verified domain.
4. **Marketplace listing** — listings CDN assets in `design/` (`icon-32.png`, `icon-128.png`, screenshots); category Productivity; publish as Sheets add-on.
5. **License API** — deploy the web app’s `/api/license/verify` and set `LICENSE_API_BASE` on the script.

## Project layout

```
addon/
  src/           TypeScript source (entry: main.ts)
  dist/          clasp push target (generated)
  design/        tokens, SHEET-STYLE, Ledger Cell mark, dashboard target
  test/          Node unit tests
  scripts/build.mjs
```
