# Stripe go-live checklist

Going live should only require pasting keys into Vercel (and pointing a webhook). Price IDs are optional — the app looks up or creates products/prices by stable `lookup_key` on first checkout (or via one command below).

## 1. Stripe account

1. Use **test** mode until Checkout and license issue work end-to-end.
2. In **Developers → API keys**, copy Secret + Publishable keys.
3. Optional but recommended: run catalog sync once:

```bash
STRIPE_SECRET_KEY=sk_test_… npm run stripe:sync-prices
```

This creates:

| lookup_key | Plan |
| --- | --- |
| `revenuesheet_pro_monthly` | Pro monthly ($9) |
| `revenuesheet_pro_annual` | Pro annual ($90) |
| `revenuesheet_business_monthly` | Business monthly ($19) |
| `revenuesheet_business_annual` | Business annual ($190) |

If you skip the script, the first `/api/checkout` call creates the same catalog automatically when `STRIPE_SECRET_KEY` is set.

## 2. Webhook

**Path:** `POST https://<your-domain>/api/webhooks/stripe`

**Events (required):**

- `checkout.session.completed` — issues the license key
- `customer.subscription.updated` — syncs tier / past_due / active
- `customer.subscription.deleted` — marks license canceled

**Local:**

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Paste the CLI `whsec_…` into `STRIPE_WEBHOOK_SECRET`.

**Production:** Stripe Dashboard → Developers → Webhooks → Add endpoint → same path and events → copy signing secret into Vercel `STRIPE_WEBHOOK_SECRET`.

## 3. Vercel environment variables

Minimum for paid Checkout:

| Variable | Notes |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | **Canonical origin for the whole site** (no trailing slash). See [Domain swap](#domain-swap) below. Falls back to `VERCEL_PROJECT_PRODUCTION_URL` when unset. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_…` or `pk_live_…` (no `REPLACE`) — **enables paid buttons** |
| `STRIPE_SECRET_KEY` | Matching `sk_test_…` / `sk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` from the webhook endpoint |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Durable license storage |

Optional:

| Variable | Notes |
| --- | --- |
| `STRIPE_PRICE_*` | Override lookup_keys with fixed price IDs |
| `STRIPE_SHOW_ADMIN_BANNER=1` | Site-wide admin warning strip (owner only; turn off for public) |
| `STRIPE_ADMIN_TOKEN` or `LICENSE_API_SECRET` | Bearer token for `GET /api/admin/stripe-status` |
| `NEXT_PUBLIC_MARKETPLACE_URL` | Workspace Marketplace listing URL (preferred). Flips Install CTAs from launch-list capture to the listing. Also shows **Install from Marketplace** on `/success`. |
| `NEXT_PUBLIC_INSTALL_URL` | Legacy alias for `NEXT_PUBLIC_MARKETPLACE_URL` |
| `NEXT_PUBLIC_TEMPLATE_COPY_URL` | Google Sheets “Make a copy” template URL (bound script). Shows **Make a copy** on `/success` only when set. |
| `NEXT_PUBLIC_SUPPORT_EMAIL` / `SUPPORT_EMAIL` | Optional inbox for `/success` “Email support” mailto (e.g. `support@revenuesheet.app`). Without it, buttons link to `/support`. |

**CTA flips (env only, no code change):**

- Paid Checkout buttons turn on when `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is a real `pk_test_` / `pk_live_` value (see `checkoutEnabled` in `lib/site.ts`). The Checkout API still needs `STRIPE_SECRET_KEY` (and webhook secret for licenses). Pricing is **monthly only** on this path (no annual toggle).
- Install CTAs flip from “Join the launch list” to the Marketplace listing when `NEXT_PUBLIC_MARKETPLACE_URL` (or `NEXT_PUBLIC_INSTALL_URL`) is set.
- `/success` after Checkout: masked license key (Reveal / Copy), 3-step checklist, and “what happens next”. Make a copy + Marketplace buttons stay **hidden** until their env URLs exist. Polls up to 3 minutes, then falls back to not-found. Never surfaces raw Stripe errors.

**Launch-list email sends:** if you send launch emails (Resend or similar), use `launchListUnsubscribeHeaders(email)` and `launchUnsubscribeFooter(email)` from `lib/launch-email.ts` so every message has a one-click unsubscribe URL plus `List-Unsubscribe` / `List-Unsubscribe-Post`. Optional `LAUNCH_UNSUB_SECRET` signs tokens (falls back to `LICENSE_API_SECRET` / `STRIPE_WEBHOOK_SECRET`).

## Domain swap

Pointing production at a custom domain is **one Vercel env var**:

1. In Vercel → Project → Settings → Environment Variables (Production), set  
   `NEXT_PUBLIC_SITE_URL=https://your.domain`  
   (scheme + host, **no trailing slash**).
2. Redeploy Production so the client bundle and server both pick up the new value.

That single variable drives `siteUrl()` / `siteConfig.url` (`lib/brand.ts`), which everything else reads:

| Surface | How it follows `NEXT_PUBLIC_SITE_URL` |
| --- | --- |
| `metadataBase`, root `canonical`, `openGraph.url` | `app/layout.tsx` via `siteConfig.url` |
| Page `alternates.canonical` / `openGraph.url` | Each page uses `` `${siteConfig.url}/…` `` |
| `/sitemap.xml` | `app/sitemap.ts` prefixes every URL with `siteConfig.url` |
| `/robots.txt` sitemap line | `app/robots.ts` → `` `${siteConfig.url}/sitemap.xml` `` |
| Stripe Checkout `success_url` / `cancel_url` | `app/api/checkout/route.ts` → `siteConfig.url` |
| Launch-list unsubscribe links + `List-Unsubscribe` | `lib/launch-email.ts` → `siteUrl()` |
| Absolute OG image on the 404 page | `app/not-found.tsx` → `` `${siteUrl()}/opengraph-image` `` |

Do **not** hardcode the custom domain in app code. After the env change, confirm:

```bash
curl -sI https://your.domain/ | tr -d '\r' | grep -i location || true
curl -s https://your.domain/sitemap.xml | head -20
curl -s https://your.domain/robots.txt
curl -s https://your.domain/api/version
```

**Add-on note (separate from the marketing site):** the Apps Script default and Script Property `LICENSE_API_BASE` should be `https://www.revenuesheet.app` (see `addon/RELEASE.md`). That is not read from `NEXT_PUBLIC_SITE_URL` inside Sheets. OAuth / Marketplace publish steps: [`docs/OAUTH-STEPS.md`](./OAUTH-STEPS.md).

## 4. Verify

1. Open `/pricing` — Pro/Business buttons should no longer say “Checkout opens at launch”.
2. Complete a test Checkout; confirm `/success` shows a masked license key, Reveal/Copy works, and checklist actions appear only when `NEXT_PUBLIC_TEMPLATE_COPY_URL` / `NEXT_PUBLIC_MARKETPLACE_URL` are set.
3. Confirm the webhook delivered `checkout.session.completed` (Stripe Dashboard → Webhooks → attempts).
4. Optional admin JSON:

```bash
curl -s -H "Authorization: Bearer $STRIPE_ADMIN_TOKEN" https://<domain>/api/admin/stripe-status | jq
```

5. Flip to **live** keys in Vercel Production, create a **live** webhook with the same path/events, re-run `stripe:sync-prices` with `sk_live_…` (or let first live checkout create prices).

### Automated checks

**Deployed SHA vs `main`** — `GET /api/version` returns `{ sha }` from `VERCEL_GIT_COMMIT_SHA`. After a production deploy:

```bash
./scripts/verify-prod.sh
# or: PROD_URL=https://venture-mvp.vercel.app ./scripts/verify-prod.sh
```

This fetches `origin/main`, compares it to production’s SHA, smoke-checks `/`, `/pricing`, `/success`, and `/terms`, and fails if `/terms` still contains “ten months”.

**Stripe test-mode E2E** — Playwright spec `e2e/stripe-checkout.spec.ts` runs Checkout (Pro monthly) → webhook license issue → `/success` `data-state="ready"` → `POST /api/license/verify`. It **skips cleanly** when `STRIPE_SECRET_KEY` / checkout is not configured on the target (look for `BLOCKED (owner): Stripe test checkout skipped` in the log). Enable it by setting test keys + webhook secret + Upstash Redis on the deployment the E2E job hits (or run locally with `stripe listen` and the same env).

## 5. Do not

- Commit real keys to git.
- Mix live secret with test publishable (the admin report flags this).
- Leave `STRIPE_SHOW_ADMIN_BANNER=1` on a public production deployment.
