# OAuth verification demo — speakable script (2–3 min)

For Gatlin. Record yourself in English. Keep the sheet on **example data only** — use **Load example data**, not a live store key. Aligns with [`docs/OAUTH-STEPS.md`](./OAUTH-STEPS.md).

**Production script (for the form / voiceover if asked):**

| Field | Value |
|---|---|
| Script ID | `1t3VNkcbwEaTEya4TrQ5yKuKHX_aO_C9lcACW9PDq2TRsRJvFBVQNTVKr` |
| Deployment ID | `AKfycbywW5Q-hUKTfVPSiGWZG9vlHWcJ2euNxU4mmATREEMh1urw5vSlmmqpjepRCUibg89GCA` |
| Version | `2` |

**Scopes you will show (exactly these four):**

1. See, edit, create, and delete only the specific Google Sheets spreadsheets you use with this app  
2. Display and run third-party web content in prompts and sidebars inside Google applications  
3. Connect to an external service  
4. Allow this application to run when you are not present  

---

## Shot 1 — Consent screen (~30s)

**Do:** Open a blank Google Sheet → install / first-run RevenueSheet until the Google account chooser and **consent screen** appear. Widen the window so the **address bar** shows the OAuth URL (`client_id=` …).

**Say:**  
“This is RevenueSheet’s OAuth consent. Pause here — you can see the OAuth client ID in the URL bar.”  
*(Pause 3 seconds on the URL.)*  
“We request four scopes only: access to the current spreadsheet, the sidebar UI, outbound HTTPS to commerce APIs and our license server, and time-driven triggers for scheduled refresh. No Drive, Gmail, or send-mail.”

**Click:** Review the four scopes → **Allow**.

---

## Shot 2 — Sidebar UI (`script.container.ui`) (~20s)

**Do:** In the sheet, open **Extensions → RevenueSheet → Open sidebar** (or the homepage card button **Open sidebar**).

**Say:**  
“That’s the container UI scope — the custom **RevenueSheet** menu and this sidebar, where keys stay in User Properties.”

*(Pan the sidebar: License & display, **Save settings**, **Sync now**.)*

---

## Shot 3 — Write the current sheet (`spreadsheets.currentonly`) (~35s)

**Do:** **Extensions → RevenueSheet → Load example data**. Wait for the toast. Show the Dashboard tab filling with EXAMPLE DATA (and tabs like Orders / Subscriptions if visible).

**Say:**  
“I’m using **Load example data** so no real customers appear. The add-on only writes this open spreadsheet — that’s `spreadsheets.currentonly`.”

---

## Shot 4 — External HTTPS (`script.external_request`) (~35s)

**Do:** In the sidebar, paste a **test license key** under **License key** (blur or crop the value if needed). Click **Save settings**. Optionally click **Sync now** — with no store API keys it still hits license verify over HTTPS and will not pull live store rows.

**Say:**  
“Save settings calls our license API at revenuesheet.app over UrlFetch — that’s `script.external_request`. Store sync would use the same scope for Stripe, Polar, Lemon Squeezy, or Gumroad. I’m not pasting a live store key, so you only see example data in the sheet.”

---

## Shot 5 — Scheduled refresh trigger (`script.scriptapp`) (~25s)

**Do (pick one, both are real labels):**

- Menu: **Extensions → RevenueSheet → Enable scheduled refresh**, **or**  
- Sidebar: check **Scheduled refresh**, pick a **Cadence** (e.g. **Hourly**), click **Save settings**.

**Say:**  
“Enable scheduled refresh installs a time-driven Apps Script trigger so paid plans can sync when I’m not in the sheet — that’s `script.scriptapp`.”

---

## Shot 6 — Close (~15s)

**Do:** Brief end card or browser tab: https://www.revenuesheet.app · /privacy · /terms.

**Say:**  
“Homepage, privacy, and terms are on revenuesheet.app. Same four scopes in the Marketplace listing — no Drive, no Gmail, no send_mail.”

---

## Checklist before you hit stop

- [ ] Consent screen readable; four scopes in English  
- [ ] Pause with OAuth `client_id` visible in the URL bar  
- [ ] **Open sidebar** shown  
- [ ] **Load example data** used (no live store key)  
- [ ] **Save settings** / **Sync now** for license UrlFetch  
- [ ] **Enable scheduled refresh** or **Scheduled refresh** + **Save settings**  
- [ ] Total under ~3 minutes  
