# RevenueSheet — Google Sheets add-on

Clasp-ready Apps Script (TypeScript) that syncs Lemon Squeezy, Polar, Gumroad, and Stripe into your spreadsheet and builds an MRR / churn dashboard.

Brand name is swappable from a single constant: [`src/lib/brand.ts`](src/lib/brand.ts) (`BRAND.name`). The placeholder logo is the **Ledger Cell** mark (`design/ledger-cell-mark*.png`, logo-v2 concept 3).

Design target (launch v2): [`design/revenuesheet-dashboard-template-preview.png`](design/revenuesheet-dashboard-template-preview.png) · [`design/revenuesheet-dashboard-template.xlsx`](design/revenuesheet-dashboard-template.xlsx) · [`design/SHEET-STYLE.md`](design/SHEET-STYLE.md). Marketplace listing assets: [`design/marketplace/`](design/marketplace/) (icons + final 1280×800 screenshots). Hosted logos for OAuth / Marketplace: [`/brand/logo-128.png`](../public/brand/logo-128.png) and [`/brand/logo-32.png`](../public/brand/logo-32.png) on https://www.revenuesheet.app.

## Prerequisites

- Node 20+
- A Google account
- [clasp](https://github.com/google/clasp) (`npm i -g @google/clasp`)
- GCP project **`revenuesheet-511320`** (OAuth / Marketplace)

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
3. Link the script to GCP project **`revenuesheet-511320`** (see [`docs/OAUTH-STEPS.md`](../docs/OAUTH-STEPS.md)).
4. Push:

```bash
npm run push
```

5. In the Apps Script editor → **Project Settings** → set script properties:
   - `LICENSE_API_BASE` — `https://www.revenuesheet.app` (no trailing slash; also the code default in `src/lib/config.ts`)
   - `LICENSE_API_SECRET` — optional; sent as `x-license-secret` when the site sets `LICENSE_API_SECRET`

   The add-on calls `POST {LICENSE_API_BASE}/api/license/verify` with `{ "key": "…" }` and expects `{ "valid": true, "tier": "free"|"pro"|"business", "limits": { "maxSources", "maxStores", "scheduledRefresh" } }`.

## Local scripts

| Command | Purpose |
|---|---|
| `npm test` | Unit tests (MRR / churn / ARPU + importer mappers with mocked fetch) |
| `npm run build` | Bundle `src/` → `dist/Code.js` + `Sidebar.html` + `appsscript.json` |
| `npm run push` | Build then `clasp push` |
| `npm run typecheck` | `tsc --noEmit` |

## OAuth scopes (non-sensitive)

Declared in `src/appsscript.json` (no `send_mail`):

| Scope | Why the code needs it |
|---|---|
| `drive.file` | Workspace add-on per-file grant before any `SpreadsheetApp` call |
| `spreadsheets.currentonly` | Sheets service read/write of the open spreadsheet’s cells/tabs |
| `script.container.ui` | Menu + sidebar (`getUi` / `HtmlService`) |
| `script.external_request` | `UrlFetchApp` to sources + license API |
| `script.scriptapp` | Time-driven scheduled refresh triggers |

Homepage card requests file scope via `requestFileScopeForActiveDocument` when `sheets.addonHasFileScopePermission` is false.

Manifest `logoUrl`: `https://www.revenuesheet.app/brand/logo-128.png`.

Paste-ready verification text + Marketplace click list: [`docs/OAUTH-STEPS.md`](../docs/OAUTH-STEPS.md).

## Features

- **Sidebar** — API keys + license; MRR goal; template picker (Growth default; Classic alternative); schedule cadence; CSV paste. Keys in **User Properties**.
- **Importers** — Lemon Squeezy, Polar, Gumroad, Stripe (restricted read-only key), CSV fallback with column mapping. Resumable chunked backfill (`pageToken` / resource). Gumroad uses `page_key`. Intervals (quarterly / biannual / biennial / yearly / …) → monthly MRR.
- **Metrics** — MRR (active-only by default), ARR, LTV, churn, cohort retention, refunds, top products, revenue by country, MRR goal progress bar.
- **Schedule** — hourly / 6h / daily / weekly (paid tier); finishes incomplete backfills.
- **Weekly digest** — code path exists but needs sensitive scope `script.send_mail` (**not** in default `appsscript.json`); do not enable for Marketplace v1.
- **Dashboard** — `SHEET-STYLE.md` launch v2 (white header + ink rule, greyscale charts). Growth (default) adds ARR/LTV/cohorts/country panels.
- **License** — free = 1 source, manual refresh; unreachable API degrades gracefully to free limits.
- **Demo mode** — **Load example data** fills SAMPLE rows clearly labeled for screenshots.

## Release & test install

Exact **clasp push** and **unverified / test-deployment install** steps: [`RELEASE.md`](./RELEASE.md).

## Marketplace publish (owner)

Numbered click list (GCP project number → Marketplace SDK → OAuth verification + demo video shot list): **[`docs/OAUTH-STEPS.md`](../docs/OAUTH-STEPS.md)**.

Summary:

1. Link Apps Script to GCP **`revenuesheet-511320`**; enable Marketplace SDK (+ Sheets API if needed).
2. Consent screen scopes = the four above; logos on https://www.revenuesheet.app/brand/.
3. Versioned Add-on deployment → paste Deployment ID into Marketplace App Configuration.
4. Store Listing: Productivity; screenshots in [`design/marketplace/`](design/marketplace/); short description = site pitch.
5. `LICENSE_API_BASE` = `https://www.revenuesheet.app`.

## Project layout

```
addon/
  src/           TypeScript source (entry: main.ts)
  dist/          clasp push target (generated)
  design/        tokens, SHEET-STYLE, Ledger Cell mark, dashboard target, marketplace/
  test/          Node unit tests
  scripts/build.mjs
```
