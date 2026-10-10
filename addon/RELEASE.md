# RevenueSheet add-on — release & test install

Clasp-ready release notes for pushing `addon/dist` to an Apps Script project and installing it for internal testing (unverified OAuth / test deployment). This is **not** the Workspace Marketplace publish checklist (see [README.md](./README.md#marketplace-publish-checklist-owner)).

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
| `appsscript.json` | Manifest (scopes + Sheets add-on triggers) |

`dist/` is gitignored — always build before push. Do not edit files under `dist/` by hand.

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
| `LICENSE_API_BASE` | Web app origin, e.g. `https://venture-mvp.vercel.app` (no trailing slash) |
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

For day-to-day testing, **Test deployments** (below) can run against Head without a numbered deploy.

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
3. Review scopes and **Allow**:
   - See and edit spreadsheets you have opened (`spreadsheets.currentonly`)
   - Connect to external services (`script.external_request`)
   - Run triggers (`script.scriptapp`)
   - Display sidebar/menu UI (`script.container.ui`)

Do **not** add `script.send_mail` unless you are intentionally testing the weekly digest (sensitive scope; not in the default manifest).

### C. Smoke checklist after install

1. **Extensions → RevenueSheet → Open sidebar** (or menu **Open sidebar**).
2. **Load example data** → Dashboard fills with EXAMPLE DATA; status band says example.
3. Confirm tabs/order: Dashboard, Cohorts, Orders, Subscriptions, Customers, Refunds, MRR monthly, Settings.
4. Clear keys / don’t connect a source on a fresh sheet → empty onboarding state (status **NOT CONNECTED**, step cards).
5. Paste a test source key (or CSV) → **Save settings** → **Sync now** / **Full backfill**.
6. Paid schedule: paste a valid license key under **License & display**, then **Enable scheduled refresh**. Without a key you should see:  
   `Paste your license key in the sidebar (License & display).`

### D. Sharing the test install with other accounts

- **Test deployments** are limited to accounts you add as test users (and the project owner).
- For a small dogfood group: add each account under the GCP OAuth consent screen → **Test users** (External + Testing), and have them install via the same Test deployment / script owner share.
- Or publish a **private** Workspace Marketplace listing to your domain (owner-only GCP steps; see README Marketplace checklist).

---

## Release branch note

This file is maintained on `cursor/addon-release-9efa` for the website build to fold into a single merge. Do not treat a push of this branch alone as a production Marketplace publish.

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
