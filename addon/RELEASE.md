# RevenueSheet add-on — release & test install

Clasp-ready release notes for pushing `addon/dist` to an Apps Script project and installing it for internal testing. For **OAuth verification + Workspace Marketplace publish**, follow the click list in [`docs/OAUTH-STEPS.md`](../docs/OAUTH-STEPS.md).

## GCP / consent (production)

| Item | Value |
|---|---|
| GCP project ID | `revenuesheet-511320` |
| OAuth consent | External |
| App name | RevenueSheet |
| Homepage | https://www.revenuesheet.app |
| Privacy | https://www.revenuesheet.app/privacy |
| Terms | https://www.revenuesheet.app/terms |
| Authorized domain | `revenuesheet.app` (verified in Search Console) |
| Add-on logo (manifest) | https://www.revenuesheet.app/brand/logo-128.png |
| Small logo | https://www.revenuesheet.app/brand/logo-32.png |
| Script ID | `1t3VNkcbwEaTEya4TrQ5yKuKHX_aO_C9lcACW9PDq2TRsRJvFBVQNTVKr` |
| Marketplace deployment ID | `AKfycbywW5Q-hUKTfVPSiGWZG9vlHWcJ2euNxU4mmATREEMh1urw5vSlmmqpjepRCUibg89GCA` |
| Deployment version | `2` |

Link the Apps Script project to GCP project `revenuesheet-511320` before creating a versioned Marketplace deployment (steps in [`docs/OAUTH-STEPS.md`](../docs/OAUTH-STEPS.md)). Speakable OAuth demo script: [`docs/DEMO-VIDEO-SCRIPT.md`](../docs/DEMO-VIDEO-SCRIPT.md).

## Preflight (must be green)

From repo root:

```bash
cd addon
npm install
npm test
npm run typecheck
npm run build
```

Expected:

| Check | Result |
|---|---|
| `npm test` | All suites pass (unit tests for importers, intervals, MRR, churn, backfill, …) |
| `npm run typecheck` | `tsc --noEmit` exits 0 |
| `npm run build` | Writes clasp bundle to `addon/dist/` |

### Build output (`addon/dist/`)

| File | Role |
|---|---|
| `Code.js` | Bundled Apps Script entry (`src/main.ts` via esbuild IIFE) |
| `Sidebar.html` | Sidebar UI (brand name injected from `src/lib/brand.ts`) |
| `appsscript.json` | Manifest (scopes + Sheets add-on triggers + logo) |

`dist/` is gitignored — always build before push. Do not edit files under `dist/` by hand.

---

## OAuth scopes (default manifest — no `send_mail`)

Declared in [`src/appsscript.json`](./src/appsscript.json). Only what the shipped code uses:

| Scope | Why |
|---|---|
| `https://www.googleapis.com/auth/drive.file` | Workspace add-on per-file grant (`onFileScopeGrantedTrigger` / `requestFileScopeForActiveDocument`). Non-sensitive; only files the user opens with or grants to the app — **not** broad Drive. Required before any `SpreadsheetApp` call. |
| `https://www.googleapis.com/auth/spreadsheets.currentonly` | `SpreadsheetApp` read/write of cells and tabs in that same open spreadsheet (dashboard + data tabs). Kept in addition to `drive.file` because the Sheets service needs this scope. |
| `https://www.googleapis.com/auth/script.container.ui` | Custom menu + sidebar (`SpreadsheetApp.getUi()`, `HtmlService` / `showSidebar`). |
| `https://www.googleapis.com/auth/script.external_request` | `UrlFetchApp` HTTPS to Lemon Squeezy, Polar, Gumroad, Stripe, and `LICENSE_API_BASE` license verify. |
| `https://www.googleapis.com/auth/script.scriptapp` | Install/remove time-driven triggers for scheduled refresh (`ScriptApp.newTrigger`). |

**Not declared:** `script.send_mail` (weekly digest is opt-in / not in default build). Paste-ready justifications: [`docs/OAUTH-STEPS.md`](../docs/OAUTH-STEPS.md#scope-justifications-paste-ready). Demo script: [`docs/DEMO-VIDEO-SCRIPT.md`](../docs/DEMO-VIDEO-SCRIPT.md).

**Install UX:** homepage card checks `sheets.addonHasFileScopePermission`; if false, shows **Allow access to this spreadsheet** (no `SpreadsheetApp` until granted).

### `urlFetchWhitelist` (required by Marketplace / OAuth review)

Declared after the `addOns` block in [`src/appsscript.json`](./src/appsscript.json). Every `UrlFetchApp` host in `addon/src` must match a prefix (enforced by `addon/test/url-fetch-whitelist.test.ts`):

| Prefix | Used for |
|---|---|
| `https://www.revenuesheet.app/` | License verify (`LICENSE_API_BASE`) |
| `https://api.stripe.com/` | Stripe importer |
| `https://api.polar.sh/` | Polar importer |
| `https://api.lemonsqueezy.com/` | Lemon Squeezy importer |
| `https://api.gumroad.com/` | Gumroad importer |

No sandbox hosts (e.g. `sandbox-api.polar.sh`) appear in the code today — do not add them unless an importer starts calling them.

---

## Clasp push (exact steps)

### 1. Install tooling

```bash
# Node 20+
node -v

# clasp (global)
npm i -g @google/clasp

# Enable the Apps Script API for your Google account:
# https://script.google.com/home/usersettings  →  Google Apps Script API = On
```

### 2. Log in

```bash
cd addon
clasp login
```

Complete the browser OAuth flow with the Google account that owns the Apps Script project.

### 3. Point `.clasp.json` at your script

[`./.clasp.json`](./.clasp.json) ships with a placeholder:

```json
{
  "scriptId": "REPLACE_WITH_APPS_SCRIPT_ID",
  "rootDir": "dist"
}
```

**Option A — existing project**

1. Open the Apps Script project → **Project Settings** (gear) → copy **Script ID**.
2. Set `"scriptId"` in `addon/.clasp.json` to that value (do not commit a production script ID unless the team agrees).

**Option B — create a new standalone project**

```bash
cd addon
npm run build
clasp create --type standalone --title "RevenueSheet" --rootDir ./dist
```

This overwrites `.clasp.json` with the new `scriptId`. For a container-bound script instead, create the script from a Sheet (**Extensions → Apps Script**) and use Option A.

### 4. Build and push

```bash
cd addon
npm test
npm run typecheck
npm run build
clasp push
```

Or the shorthand (build + push only):

```bash
cd addon
npm run push
```

Confirm in the clasp output that `Code.js`, `Sidebar.html`, and `appsscript.json` uploaded. Then:

```bash
clasp open-script
```

### 5. Script properties (required for license verify)

In the Apps Script editor → **Project Settings → Script properties**:

| Property | Value |
|---|---|
| `LICENSE_API_BASE` | `https://www.revenuesheet.app` (no trailing slash; also the code default) |
| `LICENSE_API_SECRET` | Optional; must match the site’s `LICENSE_API_SECRET` if set |

The add-on calls `POST {LICENSE_API_BASE}/api/license/verify` with `{ "key": "…" }`.

### 6. Head deployment (optional version pin)

After a good push, create a versioned deployment if you want a stable “Head” vs numbered deploy:

```bash
cd addon
clasp push
clasp version "release candidate"
clasp deploy --description "RevenueSheet RC"
```

For day-to-day testing, **Test deployments** (below) can run against Head without a numbered deploy. Marketplace submission needs a **versioned** deployment ID (see `docs/OAUTH-STEPS.md`).

---

## Install for testing (test deployment / unverified)

Use this path before Marketplace verification. Testers will see Google’s **unverified app** warning; that is expected.

### A. Editor add-on — Test deployments (recommended)

1. Open the script: `clasp open-script` (or script.google.com).
2. Confirm the latest push is on **Head** (or select the versioned deployment from step 6 above).
3. **Deploy → Test deployments**.
4. **Install** (or **Application** → Google Sheets → Install).
5. Choose the Google account that should see the add-on.
6. Open (or create) a Google Sheet → refresh the page.
7. You should see the **RevenueSheet** menu and, from the Workspace add-on sidebar entry, the homepage card (**Open sidebar**).

If the menu is missing: hard-refresh the Sheet, confirm you’re on the same Google account, and that Test deployments lists the install as active.

### B. First-run authorization (unverified)

On first use (Open sidebar / Sync / etc.):

1. Google shows **Google hasn’t verified this app**.
2. Click **Advanced** → **Go to RevenueSheet (unsafe)** (wording may vary slightly).
3. Review scopes and **Allow** (English consent labels):
   - See, edit, create, and delete only the specific Google Drive files you use with this app (`drive.file`)
   - See, edit, create, and delete only the specific Google Sheets spreadsheets you use with this app (`spreadsheets.currentonly`)
   - Display and run third-party web content in prompts and sidebars inside Google applications (`script.container.ui`)
   - Connect to an external service (`script.external_request`)
   - Allow this application to run when you are not present (`script.scriptapp`)
4. On the RevenueSheet homepage card, click **Allow access to this spreadsheet** if prompted (per-file `drive.file` grant). Then use **Open sidebar**.

Do **not** add `script.send_mail` unless you are intentionally testing the weekly digest (sensitive scope; not in the default manifest).

### C. Smoke checklist after install

1. Homepage card → **Allow access to this spreadsheet** (if shown) → **Open sidebar** (or **Extensions → RevenueSheet → Open sidebar**).
2. **Load example data** → Dashboard fills with EXAMPLE DATA; status band says example.
3. Confirm tabs/order: Dashboard, Cohorts, Orders, Subscriptions, Customers, Refunds, MRR monthly, Settings.
4. Clear keys / don’t connect a source on a fresh sheet → empty onboarding state (status **NOT CONNECTED**, step cards).
5. Paste a test source key (or CSV) → **Save settings** → **Sync now** / **Full backfill**.
6. Paid schedule: paste a valid license key under **License & display**, enable scheduled refresh in the sidebar. Without a paid key you should see an upgrade CTA pointing at `/pricing`.

### D. Sharing the test install with other accounts

- **Test deployments** are limited to accounts you add as test users (and the project owner).
- For a small dogfood group: add each account under the GCP OAuth consent screen → **Test users** (External + Testing), and have them install via the same Test deployment / script owner share.
- Or publish a **private** Workspace Marketplace listing to your domain (owner-only GCP steps; see [`docs/OAUTH-STEPS.md`](../docs/OAUTH-STEPS.md)).

---

## Quick command card

```bash
cd addon
npm install
npm test && npm run typecheck && npm run build
# edit .clasp.json scriptId if needed
clasp login          # once per machine
clasp push
clasp open-script    # then Deploy → Test deployments → Install
```
