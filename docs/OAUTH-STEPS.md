# OAuth verification + Workspace Marketplace — click list

For Gatlin. GCP project **`revenuesheet-511320`**. Domain **`revenuesheet.app`** is verified in Search Console. Consent screen is already **External**: app name **RevenueSheet**, homepage https://www.revenuesheet.app, privacy/terms links, authorized domain `revenuesheet.app`.

Repo companions: [`addon/RELEASE.md`](../addon/RELEASE.md) (clasp / test install), [`addon/README.md`](../addon/README.md) (scopes overview), listing screenshots in [`addon/design/marketplace/`](../addon/design/marketplace/).

Logos (hosted on the site, not raw GitHub):

- https://www.revenuesheet.app/brand/logo-128.png
- https://www.revenuesheet.app/brand/logo-32.png

---

## A. Wire Apps Script → GCP

1. Open [Google Cloud Console](https://console.cloud.google.com/) → select project **`revenuesheet-511320`**.
2. **IAM & Admin → Settings** (or project dashboard) → copy **Project number**.
3. Open the RevenueSheet Apps Script project → **Project Settings** (gear).
4. Under **Google Cloud Platform (GCP) Project** → **Change project** → paste the **Project number** → confirm.
5. Confirm the script shows project **`revenuesheet-511320`**.

## B. Enable APIs

6. In GCP → **APIs & Services → Library**.
7. Enable **Google Workspace Marketplace SDK**.
8. Enable **Google Sheets API** (if not already On).
9. Enable **Apps Script API** (if clasp push / deployments need it from this project).

## C. Consent screen scopes (exact five)

10. GCP → **APIs & Services → OAuth consent screen**.
11. Confirm **User type = External**, app name **RevenueSheet**, homepage / privacy / terms, authorized domain **`revenuesheet.app`**.
12. **Edit App → Scopes → Add or remove scopes** → add **only**:

    - `https://www.googleapis.com/auth/drive.file`
    - `https://www.googleapis.com/auth/spreadsheets.currentonly`
    - `https://www.googleapis.com/auth/script.container.ui`
    - `https://www.googleapis.com/auth/script.external_request`
    - `https://www.googleapis.com/auth/script.scriptapp`

13. Do **not** add `script.send_mail`, `drive`, `drive.readonly`, or Gmail scopes.
14. Save. Keep publishing status **Testing** until OAuth verification is submitted; then move to **In production** when Google instructs.

## D. Script property + push

15. Apps Script → **Project Settings → Script properties** → set `LICENSE_API_BASE` = `https://www.revenuesheet.app` (no trailing slash).
16. Locally: `cd addon && npm test && npm run typecheck && npm run build && clasp push`.
17. Confirm `appsscript.json` has the five scopes, `onFileScopeGrantedTrigger`, and `logoUrl` = `https://www.revenuesheet.app/brand/logo-128.png`.

## E. Versioned deployment

18. Apps Script → **Deploy → New deployment**.
19. Type: **Add-on** (Sheets).
20. Description: e.g. `RevenueSheet Marketplace v1`.
21. Deploy → copy the **Deployment ID** (and note the version number).

## F. Marketplace SDK — App Configuration

22. GCP → **Google Workspace Marketplace SDK → App Configuration**.
23. **App visibility**: Public (or Private to your domain for a dry run).
24. **Installation settings**: Individual + Admin install as you prefer for a Sheets add-on.
25. **App integrations**: **Sheets add-on** → paste the **Deployment ID** from step 21.
26. **OAuth scopes**: same five URLs as the consent screen / `appsscript.json` (no `send_mail`).
27. **Developer info**: support / developer emails you use for the listing.
28. **Homepage**: https://www.revenuesheet.app  
    **Privacy**: https://www.revenuesheet.app/privacy  
    **Terms**: https://www.revenuesheet.app/terms
29. **Graphics**: application icon **128×128** → `logo-128.png`; small **32×32** → `logo-32.png` (or upload the files from `public/brand/` / `addon/design/marketplace/icon-*.png`).
30. Save App Configuration.

## G. Marketplace SDK — Store Listing

31. Open **Store Listing**.
32. Language: English.
33. App name: **RevenueSheet**.
34. Short description (≤80 chars, matches site pitch):

    > All your stores, in a sheet you own.

35. Detailed description (paste-ready; aligns with site meta / landing):

    > RevenueSheet syncs Lemon Squeezy, Polar, Gumroad, and Stripe revenue into Google Sheets on a schedule and builds an MRR dashboard in a spreadsheet you own. Paste a source API key (or import CSV), sync orders and subscriptions, and track MRR, churn, and product revenue without another hosted analytics login. Free includes one connected store and manual refresh; Pro unlocks all four sources plus scheduled refresh; Business adds multi-store MRR (up to 20 stores). API keys stay in your Google account (User Properties). The add-on only accesses the spreadsheet you open it from (per-file `drive.file` + `spreadsheets.currentonly`) and calls commerce APIs plus our license verify endpoint over HTTPS.

36. Category: **Productivity** (Sheets add-on) — same as [`addon/README.md`](../addon/README.md).
37. Screenshots (1280×800) from `addon/design/marketplace/`:

    - `screenshot-1-dashboard-1280x800.png`
    - `screenshot-2-growth-1280x800.png`
    - `screenshot-3-cohorts-1280x800.png`
    - `screenshot-4-connect-1280x800.png`
    - `screenshot-5-schedule-1280x800.png`

38. Card banner: `addon/design/marketplace/card-banner-220x140.png` if the form asks for it.
39. Save Store Listing.

## H. Submit reviews

40. **OAuth verification**: APIs & Services → OAuth consent screen → **Publish app** / **Prepare for verification** → submit with demo video (shot list below) + scope justifications (below) + links to privacy/terms/homepage.
41. **Marketplace review**: Marketplace SDK → submit the listing for review when App Configuration + Store Listing are complete and the deployment ID is live.
42. After approval: set Vercel `NEXT_PUBLIC_MARKETPLACE_URL` to the listing URL so Install CTAs flip (see [`docs/GO-LIVE.md`](./GO-LIVE.md)).

---

## Scope justifications (paste-ready)

Use these on the OAuth verification form. Match [`app/privacy/page.tsx`](../app/privacy/page.tsx) / [`app/security/page.tsx`](../app/security/page.tsx).

### `https://www.googleapis.com/auth/drive.file`

> RevenueSheet is a Google Workspace Sheets add-on. It needs the non-sensitive `drive.file` scope so the user can grant access to the specific spreadsheet they open with the add-on (homepage card → “Allow access to this spreadsheet” → `requestFileScopeForActiveDocument`). We do not request broad Drive access (`drive` / `drive.readonly`). This scope only covers files the user opens with or explicitly grants to the app, and is required for the Workspace add-on `onFileScopeGrantedTrigger` file-scope model before any `SpreadsheetApp` calls.

### `https://www.googleapis.com/auth/spreadsheets.currentonly`

> After per-file access is granted, RevenueSheet uses the Sheets service (`SpreadsheetApp`) to create and update dashboard and data tabs (Orders, Subscriptions, Customers, Refunds, Settings, MRR monthly, Cohorts) in that same open spreadsheet. `spreadsheets.currentonly` limits Sheets API access to the current spreadsheet rather than all of the user’s spreadsheets.

### `https://www.googleapis.com/auth/script.container.ui`

> RevenueSheet shows a custom menu and a sidebar inside Google Sheets so users can paste API keys, save settings, sync, and import CSV. This scope is required for `SpreadsheetApp.getUi()` / `HtmlService` sidebar UI only; it does not access file contents by itself.

### `https://www.googleapis.com/auth/script.external_request`

> RevenueSheet calls external HTTPS APIs with `UrlFetchApp`: Lemon Squeezy, Polar, Gumroad, and Stripe (using keys the user pastes) to import orders and subscriptions, and our license API at `https://www.revenuesheet.app/api/license/verify` to enforce Free / Pro / Business limits. We do not use this scope for unrelated services.

### `https://www.googleapis.com/auth/script.scriptapp`

> RevenueSheet installs and removes time-driven Apps Script triggers so paid users can refresh data on a cadence (hourly, every 6 hours, daily, or weekly) when they are not in the sheet. Without this scope, scheduled sync cannot run.

**Do not request** `https://www.googleapis.com/auth/script.send_mail` — weekly email digest is not in the default manifest.

---

## Demo video

**Full speakable script (clicks + exact lines):** [`docs/DEMO-VIDEO-SCRIPT.md`](./DEMO-VIDEO-SCRIPT.md).

Shot summary (~2–3 min, English consent scopes, pause on OAuth `client_id` in the URL bar):

| # | On screen | Scope | ~sec |
|---|---|---|---|
| 1 | Consent screen with five scopes → Allow | All five | 30 |
| 2 | Homepage card → **Allow access to this spreadsheet** (file-scope grant) | `drive.file` | 20 |
| 3 | **Open sidebar** | `script.container.ui` | 15 |
| 4 | **Load example data** (menu) — EXAMPLE DATA only | `spreadsheets.currentonly` | 30 |
| 5 | License key → **Save settings** / **Sync now** (no live store key) | `script.external_request` | 30 |
| 6 | **Enable scheduled refresh** (or sidebar **Scheduled refresh** + **Save settings**) | `script.scriptapp` | 25 |
| 7 | End: revenuesheet.app /privacy /terms | — | 10 |

Do **not** demo `send_mail`.
