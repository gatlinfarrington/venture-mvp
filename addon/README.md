# RevenueSheet — Google Sheets add-on

Clasp-ready Apps Script (TypeScript) that syncs Lemon Squeezy, Polar, and Gumroad into your spreadsheet and builds an MRR / churn dashboard.

Brand name is swappable from a single constant: [`src/lib/brand.ts`](src/lib/brand.ts) (`BRAND.name`). The placeholder logo is the **Ledger Cell** mark (`design/ledger-cell-mark*.png`, logo-v2 concept 3).

Design target: [`design/sheet-dashboard-target.png`](design/sheet-dashboard-target.png) · [`design/SHEET-STYLE.md`](design/SHEET-STYLE.md).

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

4. In the Apps Script editor → **Project Settings** → set script property `LICENSE_API_BASE` to your web app origin (e.g. `https://revenuesheet.app`). The add-on calls `POST {LICENSE_API_BASE}/api/license/verify` with `{ "key": "…" }` and expects `{ "tier": "free"|"pro"|"multi", "ok": true }`.

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

- **Sidebar** — enter API keys + license key; stored in **User Properties** (per Google account, not in the sheet).
- **Importers** — Lemon Squeezy, Polar, Gumroad: orders, subscriptions, customers, refunds. Full backfill + incremental cursor, pagination, 429 backoff.
- **Schedule** — hourly time-driven trigger (paid tier).
- **Dashboard** — matches `SHEET-STYLE.md` (header band + Ledger Cell mark, KPI cards, stacked MRR chart, churn line, banded tables, conditional formatting).
- **License** — free = 1 source, manual refresh; unreachable API degrades gracefully to free limits.
- **Demo mode** — **Load example data** fills SAMPLE rows clearly labeled for screenshots.

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
